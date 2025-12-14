import { useState, useEffect, useMemo } from 'react';
import { Trophy, Award } from 'lucide-react';
import { TeamLogo } from '../Common/TeamLogo';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { RosterModal } from '../Common/RosterModal';
import { PlayoffBracket } from './PlayoffBracket';
import { SleeperService } from '../../services/sleeper.service';
import { getLeagueId, getUserInfoBySleeperId, getCurrentTeamName, getCurrentAbbreviation } from '../../config/constants';
import { getLeagueName } from '../../constants/leagues';
import { useAllStandings } from '../../hooks/useLeagues';
import { calculateRankings } from '../../utils/ranking';
import type { LeagueTier } from '../../types';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';
import { shouldShowMatchupColors } from '../../utils/nfl-schedule';

interface BracketMatch {
  r: number; // round
  t1: number; // team 1 roster_id
  t2: number; // team 2 roster_id
  w?: number; // winner roster_id
  l?: number; // loser roster_id
  p?: number; // placement
  m?: number; // match_id
}

interface ProcessedMatchup {
  team1UserId: string;
  team2UserId: string;
  team1Name: string;
  team2Name: string;
  team1Abbr: string;
  team2Abbr: string;
  team1Score: number;
  team2Score: number;
  team1RosterId: number;
  team2RosterId: number;
  team1Seed?: number;
  team2Seed?: number;
  week: number;
  isBye: boolean;
}

interface ByeTeam {
  userId: string;
  teamName: string;
  abbreviation: string;
  seed: number;
}

interface LeagueBrackets {
  league: LeagueTier;
  playoffMatchups: ProcessedMatchup[];
  consolationMatchups: ProcessedMatchup[];
  playoffByeTeams: ByeTeam[];
  consolationByeTeams: ByeTeam[];
  isLoading: boolean;
  error?: string;
}

const PLAYOFF_WEEKS = [15, 16, 17];
const CURRENT_YEAR = '2025';

export const PlayoffMatchupList = () => {
  const { data: allStandings } = useAllStandings();
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier>('PREMIER');
  const [bracketsData, setBracketsData] = useState<LeagueBrackets[]>([
    { league: 'PREMIER', playoffMatchups: [], consolationMatchups: [], playoffByeTeams: [], consolationByeTeams: [], isLoading: true },
    { league: 'MASTERS', playoffMatchups: [], consolationMatchups: [], playoffByeTeams: [], consolationByeTeams: [], isLoading: true },
    { league: 'NATIONAL', playoffMatchups: [], consolationMatchups: [], playoffByeTeams: [], consolationByeTeams: [], isLoading: true }
  ]);

  const { openTeamProfile } = useTeamProfileModal();
  const [rosterModal, setRosterModal] = useState<{
    isOpen: boolean;
    leagueId: string;
    winnerUserId: string;
    loserUserId: string;
    week: number;
    winnerTeamName: string;
    loserTeamName: string;
    winnerAbbreviation: string;
    loserAbbreviation: string;
  }>({
    isOpen: false,
    leagueId: '',
    winnerUserId: '',
    loserUserId: '',
    week: 0,
    winnerTeamName: '',
    loserTeamName: '',
    winnerAbbreviation: '',
    loserAbbreviation: ''
  });

  const sleeperService = useMemo(() => new SleeperService(), []);

  const colorMap = {
    PREMIER: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      text: 'text-yellow-800 dark:text-yellow-300',
      iconBg: 'bg-yellow-500',
      highlight: 'bg-yellow-100 dark:bg-yellow-900/30',
      matchupBg: 'bg-yellow-50/50 dark:bg-white/10 hover:bg-yellow-50 dark:hover:bg-white/20'
    },
    MASTERS: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-300 dark:border-purple-700',
      text: 'text-purple-800 dark:text-purple-300',
      iconBg: 'bg-purple-500',
      highlight: 'bg-purple-100 dark:bg-purple-900/30',
      matchupBg: 'bg-purple-50/50 dark:bg-white/10 hover:bg-purple-50 dark:hover:bg-white/20'
    },
    NATIONAL: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      text: 'text-red-800 dark:text-red-300',
      iconBg: 'bg-red-500',
      highlight: 'bg-red-100 dark:bg-red-900/30',
      matchupBg: 'bg-red-50/50 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-white/20'
    }
  };

  useEffect(() => {
    const fetchBrackets = async () => {
      if (!allStandings) return;

      const leagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];

      for (const league of leagues) {
        try {
          const leagueId = getLeagueId(league, CURRENT_YEAR);
          if (!leagueId) {
            throw new Error('League ID not found');
          }

          // Get current standings for this league
          const leagueStandings = allStandings.find(s => s.league === league && s.year === CURRENT_YEAR);
          if (!leagueStandings) {
            throw new Error('Standings not found for league');
          }

          // Calculate rankings with tiebreakers
          const matchupsByWeek = (leagueStandings as any).matchupsByWeek;
          const rankedStandings = calculateRankings(leagueStandings.standings, matchupsByWeek, CURRENT_YEAR);

          // Create userId to seed mapping
          const userIdToSeed: Record<string, number> = {};
          rankedStandings.forEach(standing => {
            userIdToSeed[standing.userId] = standing.rank;
          });

          // Fetch brackets and matchups in parallel
          const [winnersBracket, losersBracket, rosters, , ...weekMatchups] = await Promise.all([
            sleeperService.getWinnersBracket(leagueId),
            sleeperService.getLosersBracket(leagueId),
            sleeperService.getLeagueRosters(leagueId),
            sleeperService.getLeagueUsers(leagueId),
            ...PLAYOFF_WEEKS.map(week => sleeperService.getMatchupsForWeek(leagueId, week))
          ]);

          // Create mappings
          const rosterToOwner: Record<number, string> = {};
          rosters.forEach(roster => {
            rosterToOwner[roster.roster_id] = roster.owner_id;
          });

          // Get bye teams (seeds 1-2 for playoff, 7-8 for consolation)
          const playoffByeTeams: ByeTeam[] = rankedStandings
            .slice(0, 2)
            .map(standing => ({
              userId: standing.userId,
              teamName: getCurrentTeamName(standing.userId, standing.userInfo.teamName),
              abbreviation: getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation),
              seed: standing.rank
            }));

          // Consolation/Toilet Bowl - seeds 11-12 get byes (worst teams)
          const consolationByeTeams: ByeTeam[] = rankedStandings
            .slice(10, 12)
            .map(standing => ({
              userId: standing.userId,
              teamName: getCurrentTeamName(standing.userId, standing.userInfo.teamName),
              abbreviation: getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation),
              seed: standing.rank
            }));

          // Process playoff bracket (winners bracket - top 6)
          const playoffMatchups = processBracket(
            winnersBracket,
            rosterToOwner,
            weekMatchups,
            userIdToSeed
          );

          // Process consolation bracket (losers bracket - bottom 6)
          const consolationMatchups = processBracket(
            losersBracket,
            rosterToOwner,
            weekMatchups,
            userIdToSeed
          );

          setBracketsData(prev => prev.map(item =>
            item.league === league
              ? {
                  ...item,
                  playoffMatchups,
                  consolationMatchups,
                  playoffByeTeams,
                  consolationByeTeams,
                  isLoading: false,
                  error: undefined
                }
              : item
          ));

        } catch (error) {
          console.error(`Failed to fetch ${league} brackets:`, error);
          setBracketsData(prev => prev.map(item =>
            item.league === league
              ? { ...item, isLoading: false, error: 'Failed to load bracket data' }
              : item
          ));
        }
      }
    };

    fetchBrackets();
  }, [sleeperService, allStandings]);

  // Process bracket matches into displayable matchups
  const processBracket = (
    bracket: BracketMatch[],
    rosterToOwner: Record<number, string>,
    weekMatchups: any[][],
    userIdToSeed: Record<string, number>
  ): ProcessedMatchup[] => {
    const matchups: ProcessedMatchup[] = [];

    // Group matches by round
    const matchesByRound: Record<number, BracketMatch[]> = {};
    bracket.forEach(match => {
      if (!matchesByRound[match.r]) {
        matchesByRound[match.r] = [];
      }
      matchesByRound[match.r].push(match);
    });

    // Process each round (1 = quarterfinals/week 15, 2 = semifinals/week 16, 3 = finals/week 17)
    [1, 2, 3].forEach(round => {
      const roundMatches = matchesByRound[round] || [];
      const week = PLAYOFF_WEEKS[round - 1]; // round 1 = week 15, etc.
      const weekMatchupData = weekMatchups[round - 1] || [];

      roundMatches.forEach(match => {
        // Check if this is a bye (only one team)
        if (!match.t1 || !match.t2) {
          return; // Skip byes for now
        }

        const team1UserId = rosterToOwner[match.t1];
        const team2UserId = rosterToOwner[match.t2];

        if (!team1UserId || !team2UserId) {
          return; // Skip if we can't find user IDs
        }

        // Get user info
        const team1Info = getUserInfoBySleeperId(team1UserId);
        const team2Info = getUserInfoBySleeperId(team2UserId);

        // Find scores from week matchups
        const team1Matchup = weekMatchupData.find((m: any) => m.roster_id === match.t1);
        const team2Matchup = weekMatchupData.find((m: any) => m.roster_id === match.t2);

        matchups.push({
          team1UserId,
          team2UserId,
          team1Name: team1Info?.teamName || 'Unknown Team',
          team2Name: team2Info?.teamName || 'Unknown Team',
          team1Abbr: team1Info?.abbreviation || '',
          team2Abbr: team2Info?.abbreviation || '',
          team1Score: team1Matchup?.points || 0,
          team2Score: team2Matchup?.points || 0,
          team1RosterId: match.t1,
          team2RosterId: match.t2,
          team1Seed: userIdToSeed[team1UserId],
          team2Seed: userIdToSeed[team2UserId],
          week,
          isBye: false
        });
      });
    });

    return matchups;
  };

  const openMatchupRosterModal = (matchup: ProcessedMatchup, league: LeagueTier) => {
    const leagueId = getLeagueId(league, CURRENT_YEAR);
    if (!leagueId) {
      console.warn('League ID not found for selected league/year');
      return;
    }

    // Determine winner/loser based on scores
    const isTeam1Winner = matchup.team1Score >= matchup.team2Score;

    setRosterModal({
      isOpen: true,
      leagueId,
      winnerUserId: isTeam1Winner ? matchup.team1UserId : matchup.team2UserId,
      loserUserId: isTeam1Winner ? matchup.team2UserId : matchup.team1UserId,
      week: matchup.week,
      winnerTeamName: isTeam1Winner ? matchup.team1Name : matchup.team2Name,
      loserTeamName: isTeam1Winner ? matchup.team2Name : matchup.team1Name,
      winnerAbbreviation: isTeam1Winner ? matchup.team1Abbr : matchup.team2Abbr,
      loserAbbreviation: isTeam1Winner ? matchup.team2Abbr : matchup.team1Abbr
    });
  };

  const closeRosterModal = () => {
    setRosterModal(prev => ({ ...prev, isOpen: false }));
  };

  const renderByeTeam = (byeTeam: ByeTeam, league: LeagueTier) => {
    const colors = colorMap[league];

    return (
      <div
        key={byeTeam.userId}
        className={`${colors.matchupBg} py-2 px-2 transition-colors rounded-lg`}
      >
        <div className="flex items-center space-x-1.5">
          <TeamLogo
            teamName={byeTeam.teamName}
            abbreviation={byeTeam.abbreviation}
            size="sm"
            clickable
            onClick={() => openTeamProfile(byeTeam.userId, byeTeam.teamName)}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
              <span className="font-bold mr-1">#{byeTeam.seed}</span>
              {byeTeam.teamName}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 italic px-2">
            BYE
          </div>
        </div>
      </div>
    );
  };

  const renderMatchup = (matchup: ProcessedMatchup, league: LeagueTier, showWeek: boolean = false) => {
    const colors = colorMap[league];
    const hasScores = matchup.team1Score > 0 || matchup.team2Score > 0;
    const isTeam1Winner = matchup.team1Score > matchup.team2Score;
    const isTie = matchup.team1Score === matchup.team2Score;
    const showColors = shouldShowMatchupColors(CURRENT_YEAR, matchup.week);

    return (
      <div
        key={`${matchup.team1UserId}-${matchup.team2UserId}-${matchup.week}`}
        className={`${colors.matchupBg} py-2 px-2 transition-colors cursor-pointer rounded-lg`}
        onClick={() => openMatchupRosterModal(matchup, league)}
      >
        {showWeek && (
          <div className="text-center mb-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Week {matchup.week}
            </span>
          </div>
        )}
        <div className="space-y-1">
          {/* Team 1 */}
          <div className={`flex items-center justify-between ${showColors && hasScores && isTeam1Winner && !isTie ? 'bg-green-50 dark:bg-green-900/20 rounded-full' : ''}`}>
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              <TeamLogo
                teamName={matchup.team1Name}
                abbreviation={matchup.team1Abbr}
                size="sm"
                clickable
                onClick={() => openTeamProfile(matchup.team1UserId, matchup.team1Name)}
              />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-xs truncate ${showColors && hasScores && isTeam1Winner && !isTie ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {matchup.team1Seed && <span className="font-bold mr-1">#{matchup.team1Seed}</span>}
                  {matchup.team1Name}
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 px-2">
              {matchup.team1Score.toFixed(2)}
            </div>
          </div>

          {/* Team 2 */}
          <div className={`flex items-center justify-between ${showColors && hasScores && !isTeam1Winner && !isTie ? 'bg-green-50 dark:bg-green-900/20 rounded-full' : ''}`}>
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              <TeamLogo
                teamName={matchup.team2Name}
                abbreviation={matchup.team2Abbr}
                size="sm"
                clickable
                onClick={() => openTeamProfile(matchup.team2UserId, matchup.team2Name)}
              />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-xs truncate ${showColors && hasScores && !isTeam1Winner && !isTie ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {matchup.team2Seed && <span className="font-bold mr-1">#{matchup.team2Seed}</span>}
                  {matchup.team2Name}
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 px-2">
              {matchup.team2Score.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="py-4">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Playoff Brackets
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Weeks 15-17
            </p>
          </div>
        </div>

        {/* League Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['PREMIER', 'MASTERS', 'NATIONAL'] as LeagueTier[]).map((league) => {
            const colors = colorMap[league];
            const isActive = selectedLeague === league;
            return (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className={`px-4 py-2 font-semibold text-sm transition-colors relative ${
                  isActive
                    ? `${colors.text} border-b-2 ${colors.border}`
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {getLeagueName(league)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Show only selected league */}
      {bracketsData
        .filter((leagueData) => leagueData.league === selectedLeague)
        .map((leagueData) => {
          const colors = colorMap[leagueData.league];

          // Group matchups by week for bracket display
          const playoffByWeek = {
            15: leagueData.playoffMatchups.filter(m => m.week === 15),
            16: leagueData.playoffMatchups.filter(m => m.week === 16),
            17: leagueData.playoffMatchups.filter(m => m.week === 17)
          };

          const consolationByWeek = {
            15: leagueData.consolationMatchups.filter(m => m.week === 15),
            16: leagueData.consolationMatchups.filter(m => m.week === 16),
            17: leagueData.consolationMatchups.filter(m => m.week === 17)
          };

          return (
            <div key={leagueData.league} className="py-4">
              {/* Desktop: Bracket View */}
              <div className="hidden md:block">
                <PlayoffBracket
                  league={leagueData.league}
                  year={CURRENT_YEAR}
                  playoffByeTeams={leagueData.playoffByeTeams}
                  consolationByeTeams={leagueData.consolationByeTeams}
                  playoffMatchups={leagueData.playoffMatchups}
                  consolationMatchups={leagueData.consolationMatchups}
                  onMatchupClick={(matchup) => openMatchupRosterModal(matchup, leagueData.league)}
                />
              </div>

              {/* Mobile: List View */}
              <div className="md:hidden space-y-4">
              {/* Playoff Bracket */}
              <div className={`champion-highlight py-4 px-4 relative overflow-hidden border-l-4 ${colors.highlight}`}>
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className={`h-5 w-5 ${colors.text}`} />
                    <span className={`text-base font-black ${colors.text} tracking-wide`}>
                      {getLeagueName(leagueData.league)} Playoff
                    </span>
                  </div>
                </div>

                {leagueData.isLoading && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <LoadingSpinner size="sm" />
                    <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading...</span>
                  </div>
                )}

                {leagueData.error && (
                  <div className="py-3">
                    <div className="text-center text-xs text-red-500 dark:text-red-400">
                      {leagueData.error}
                    </div>
                  </div>
                )}

                {!leagueData.isLoading && !leagueData.error && (
                  <div className="space-y-3">
                    {/* Byes */}
                    <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">First Round Bye</span>
                    </div>
                    <div className="space-y-2">
                      {leagueData.playoffByeTeams.map(byeTeam => renderByeTeam(byeTeam, leagueData.league))}
                    </div>

                    {/* Week 15 */}
                    <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600 mt-3">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Quarterfinals • Week 15</span>
                    </div>
                    <div className="space-y-2">
                      {playoffByWeek[15].map(matchup => renderMatchup(matchup, leagueData.league))}
                    </div>

                    {/* Week 16 */}
                    {playoffByWeek[16].length > 0 && (
                      <>
                        <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600 mt-3">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Semifinals • Week 16</span>
                        </div>
                        <div className="space-y-2">
                          {playoffByWeek[16].map(matchup => renderMatchup(matchup, leagueData.league))}
                        </div>
                      </>
                    )}

                    {/* Week 17 */}
                    {playoffByWeek[17].length > 0 && (
                      <>
                        <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600 mt-3">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Championship • Week 17</span>
                        </div>
                        <div className="space-y-2">
                          {playoffByWeek[17].map(matchup => renderMatchup(matchup, leagueData.league))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Consolation Bracket */}
              <div className={`champion-highlight py-4 px-4 relative overflow-hidden border-l-4 ${colors.highlight}`}>
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className={`h-5 w-5 ${colors.text}`} />
                    <span className={`text-base font-black ${colors.text} tracking-wide`}>
                      {getLeagueName(leagueData.league)} Consolation
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                    Losers advance
                  </p>
                </div>

                {leagueData.isLoading && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <LoadingSpinner size="sm" />
                    <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading...</span>
                  </div>
                )}

                {!leagueData.isLoading && !leagueData.error && (
                  <div className="space-y-3">
                    {/* Byes */}
                    <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">First Round Bye (Seeds 11-12)</span>
                    </div>
                    <div className="space-y-2">
                      {leagueData.consolationByeTeams.map(byeTeam => renderByeTeam(byeTeam, leagueData.league))}
                    </div>

                    {/* Week 15 */}
                    <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600 mt-3">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Round 1 • Week 15</span>
                    </div>
                    <div className="space-y-2">
                      {consolationByWeek[15].map(matchup => renderMatchup(matchup, leagueData.league))}
                    </div>

                    {/* Week 16 */}
                    {consolationByWeek[16].length > 0 && (
                      <>
                        <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600 mt-3">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Round 2 • Week 16</span>
                        </div>
                        <div className="space-y-2">
                          {consolationByWeek[16].map(matchup => renderMatchup(matchup, leagueData.league))}
                        </div>
                      </>
                    )}

                    {/* Week 17 */}
                    {consolationByWeek[17].length > 0 && (
                      <>
                        <div className="text-center py-2 border-b border-gray-300 dark:border-gray-600 mt-3">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Finals • Week 17</span>
                        </div>
                        <div className="space-y-2">
                          {consolationByWeek[17].map(matchup => renderMatchup(matchup, leagueData.league))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>
          );
        })}

      {/* Roster Modal */}
      <RosterModal
        isOpen={rosterModal.isOpen}
        onClose={closeRosterModal}
        leagueId={rosterModal.leagueId}
        winnerUserId={rosterModal.winnerUserId}
        loserUserId={rosterModal.loserUserId}
        week={rosterModal.week}
        year={CURRENT_YEAR}
        winnerTeamName={rosterModal.winnerTeamName}
        loserTeamName={rosterModal.loserTeamName}
        winnerAbbreviation={rosterModal.winnerAbbreviation}
        loserAbbreviation={rosterModal.loserAbbreviation}
      />
    </div>
  );
};
