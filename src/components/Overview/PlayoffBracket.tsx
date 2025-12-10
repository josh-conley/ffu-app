import { Trophy, Award } from 'lucide-react';
import { TeamLogo } from '../Common/TeamLogo';
import type { LeagueTier } from '../../types';
import { getLeagueName } from '../../constants/leagues';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';

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

interface PlayoffBracketProps {
  league: LeagueTier;
  playoffByeTeams: ByeTeam[];
  consolationByeTeams: ByeTeam[];
  playoffMatchups: ProcessedMatchup[];
  consolationMatchups: ProcessedMatchup[];
  onMatchupClick: (matchup: ProcessedMatchup) => void;
}

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

export const PlayoffBracket = ({
  league,
  playoffByeTeams,
  consolationByeTeams,
  playoffMatchups,
  consolationMatchups,
  onMatchupClick
}: PlayoffBracketProps) => {
  const colors = colorMap[league];
  const { openTeamProfile } = useTeamProfileModal();

  // Group by week
  const playoffByWeek = {
    15: playoffMatchups.filter(m => m.week === 15),
    16: playoffMatchups.filter(m => m.week === 16),
    17: playoffMatchups.filter(m => m.week === 17)
  };

  const consolationByWeek = {
    15: consolationMatchups.filter(m => m.week === 15),
    16: consolationMatchups.filter(m => m.week === 16),
    17: consolationMatchups.filter(m => m.week === 17)
  };

  const renderEmptyMatchup = () => (
    <div className="bg-gray-50 dark:bg-gray-800/50 py-3 px-2 rounded-lg h-[92px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
      <span className="text-xs text-gray-400 dark:text-gray-500 italic">TBD</span>
    </div>
  );

  const renderByeMatchup = (byeTeam: ByeTeam, opponentText: string) => (
    <div className={`${colors.matchupBg} py-3 px-2 transition-colors rounded-lg h-[92px]`}>
      <div className="flex items-center space-x-1.5 mb-2">
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
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 italic text-center border-t border-gray-200 dark:border-gray-700 pt-1">
        {opponentText}
      </div>
    </div>
  );

  const renderMatchup = (matchup: ProcessedMatchup) => {
    const hasScores = matchup.team1Score > 0 || matchup.team2Score > 0;
    const isTeam1Winner = matchup.team1Score > matchup.team2Score;
    const isTie = matchup.team1Score === matchup.team2Score;

    return (
      <div
        key={`${matchup.team1UserId}-${matchup.team2UserId}-${matchup.week}`}
        className={`${colors.matchupBg} py-3 px-2 transition-colors cursor-pointer rounded-lg h-[92px]`}
        onClick={() => onMatchupClick(matchup)}
      >
        <div className="space-y-1">
          {/* Team 1 */}
          <div className={`flex items-center justify-between ${hasScores && isTeam1Winner && !isTie ? 'bg-green-50 dark:bg-green-900/20 rounded-full px-1' : ''}`}>
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              <TeamLogo
                teamName={matchup.team1Name}
                abbreviation={matchup.team1Abbr}
                size="sm"
                clickable
                onClick={() => openTeamProfile(matchup.team1UserId, matchup.team1Name)}
              />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-xs truncate ${hasScores && isTeam1Winner && !isTie ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
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
          <div className={`flex items-center justify-between ${hasScores && !isTeam1Winner && !isTie ? 'bg-green-50 dark:bg-green-900/20 rounded-full px-1' : ''}`}>
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              <TeamLogo
                teamName={matchup.team2Name}
                abbreviation={matchup.team2Abbr}
                size="sm"
                clickable
                onClick={() => openTeamProfile(matchup.team2UserId, matchup.team2Name)}
              />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-xs truncate ${hasScores && !isTeam1Winner && !isTie ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
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
    <div className="space-y-6 py-4">
      {/* Playoff Bracket */}
      <div className={`champion-highlight py-4 px-4 relative overflow-hidden border-l-4 ${colors.highlight}`}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className={`h-5 w-5 ${colors.text}`} />
          <span className={`text-lg font-black ${colors.text} tracking-wide`}>
            {getLeagueName(league)} Playoff
          </span>
        </div>

        {/* Bracket Layout */}
        <div className="flex gap-8 items-start relative">
          {/* Round 1: Week 15 (Quarterfinals) */}
          <div className="flex-1 relative">
            <div className="text-center py-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Quarterfinals</span>
            </div>
            <div className="space-y-4">
              {/* Top quarterfinal */}
              <div>
                {playoffByWeek[15][0] ? renderMatchup(playoffByWeek[15][0]) : renderEmptyMatchup()}
              </div>

              {/* Bottom quarterfinal */}
              <div>
                {playoffByWeek[15][1] ? renderMatchup(playoffByWeek[15][1]) : renderEmptyMatchup()}
              </div>
            </div>
          </div>

          {/* Round 2: Week 16 (Semifinals) */}
          <div className="flex-1">
            <div className="text-center py-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Semifinals</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-4">
                {/* Top semifinal - aligns with Q1 */}
                <div>
                  {playoffByWeek[16][0]
                    ? renderMatchup(playoffByWeek[16][0])
                    : playoffByeTeams[0]
                      ? renderByeMatchup(playoffByeTeams[0], "Plays lowest remaining seed")
                      : renderEmptyMatchup()
                  }
                </div>

                {/* Bottom semifinal - aligns with Q2 */}
                <div>
                  {playoffByWeek[16][1]
                    ? renderMatchup(playoffByWeek[16][1])
                    : playoffByeTeams[1]
                      ? renderByeMatchup(playoffByeTeams[1], "Plays highest remaining seed")
                      : renderEmptyMatchup()
                  }
                </div>
              </div>

              {/* 5th Place Game */}
              <div className="mt-8">
                <div className="text-center mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">5th Place</span>
                </div>
                <div>
                  {playoffByWeek[16][2] ? renderMatchup(playoffByWeek[16][2]) : renderEmptyMatchup()}
                </div>
              </div>
            </div>
          </div>

          {/* Round 3: Week 17 (Championship) */}
          <div className="flex-1">
            <div className="text-center py-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Championship</span>
            </div>
            <div className="space-y-4">
              <div style={{ paddingTop: '46px' }}>
                <div>
                  {playoffByWeek[17][0] ? renderMatchup(playoffByWeek[17][0]) : renderEmptyMatchup()}
                </div>
              </div>

              {/* 3rd Place Game - aligned with 5th place */}
              <div style={{ marginTop: '78px' }}>
                <div className="text-center mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">3rd Place</span>
                </div>
                <div>
                  {playoffByWeek[17][1] ? renderMatchup(playoffByWeek[17][1]) : renderEmptyMatchup()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consolation Bracket */}
      <div className={`champion-highlight py-4 px-4 relative overflow-hidden border-l-4 ${colors.highlight}`}>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className={`h-5 w-5 ${colors.text}`} />
            <span className={`text-lg font-black ${colors.text} tracking-wide`}>
              {getLeagueName(league)} Consolation
            </span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
            Losers advance
          </p>
        </div>

        {/* Bracket Layout */}
        <div className="flex gap-8 items-start relative">
          {/* Round 1: Week 15 */}
          <div className="flex-1 relative">
            <div className="text-center py-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Round 1</span>
            </div>
            <div className="space-y-4">
              {/* Round 1 matchup 1 */}
              <div key="cons-r1-m1">
                {consolationByWeek[15][0] ? renderMatchup(consolationByWeek[15][0]) : renderEmptyMatchup()}
              </div>

              {/* Round 1 matchup 2 */}
              <div key="cons-r1-m2">
                {consolationByWeek[15][1] ? renderMatchup(consolationByWeek[15][1]) : renderEmptyMatchup()}
              </div>
            </div>
          </div>

          {/* Round 2: Week 16 */}
          <div className="flex-1">
            <div className="text-center py-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Round 2</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-4">
                {/* Top round 2 - aligns with R1 match 1 */}
                <div>
                  {consolationByWeek[16][0]
                    ? renderMatchup(consolationByWeek[16][0])
                    : consolationByeTeams[0]
                      ? renderByeMatchup(consolationByeTeams[0], "Plays lowest remaining seed")
                      : renderEmptyMatchup()
                  }
                </div>

                {/* Bottom round 2 - aligns with R1 match 2 */}
                <div>
                  {consolationByWeek[16][1]
                    ? renderMatchup(consolationByWeek[16][1])
                    : consolationByeTeams[1]
                      ? renderByeMatchup(consolationByeTeams[1], "Plays highest remaining seed")
                      : renderEmptyMatchup()
                  }
                </div>
              </div>

              {/* 8th Place Game */}
              <div className="mt-8">
                <div className="text-center mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">8th Place (to loser)</span>
                </div>
                <div>
                  {consolationByWeek[16][2] ? renderMatchup(consolationByWeek[16][2]) : renderEmptyMatchup()}
                </div>
              </div>
            </div>
          </div>

          {/* Round 3: Week 17 (Finals) */}
          <div className="flex-1">
            <div className="text-center py-1 mb-3">
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Finals</span>
            </div>
            <div className="space-y-4">
              <div style={{ paddingTop: '46px' }}>
                <div>
                  {consolationByWeek[17][0] ? renderMatchup(consolationByWeek[17][0]) : renderEmptyMatchup()}
                </div>
              </div>

              {/* 10th Place Game - aligned with 8th place */}
              <div style={{ marginTop: '78px' }}>
                <div className="text-center mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">10th Place (to loser)</span>
                </div>
                <div>
                  {consolationByWeek[17][1] ? renderMatchup(consolationByWeek[17][1]) : renderEmptyMatchup()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
