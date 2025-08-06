import { useEffect, useMemo, useState } from 'react';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import { UPRHorserace } from '../components/League/UPRHorserace';
import { useUrlParams } from '../hooks/useUrlParams';
import { getFFUIdBySleeperId } from '../config/constants';
import type { UserInfo, LeagueTier } from '../types';
import { Trophy, Medal, Award, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

type AllTimeSortKey = 'teamName' | 'totalWins' | 'totalLosses' | 'winPercentage' | 'playoffWins' | 'playoffLosses' | 'totalPointsFor' | 'totalPointsAgainst' | 'pointDifferential' | 'averagePointsPerGame' | 'careerHighGame' | 'careerLowGame' | 'firstPlaceFinishes' | 'secondPlaceFinishes' | 'thirdPlaceFinishes' | 'lastPlaceFinishes' | 'seasonsPlayed' | 'premierSeasons' | 'mastersSeasons' | 'nationalSeasons' | 'averageSeasonRank' | 'averageUPR';
type SeasonHistorySortKey = 'team' | 'year' | 'league' | 'record' | 'pointsFor' | 'avgPPG' | 'pointsAgainst' | 'placement' | 'upr';
type SortOrder = 'asc' | 'desc';

// Helper function to calculate playoff wins/losses based on placement
const calculatePlayoffRecord = (placement: number): { wins: number; losses: number } => {
  switch (placement) {
    case 1: return { wins: 2, losses: 0 };
    case 2: return { wins: 2, losses: 1 };
    case 3: return { wins: 1, losses: 2 };
    case 4: return { wins: 1, losses: 2 };
    case 5: return { wins: 0, losses: 1 };
    case 6: return { wins: 0, losses: 1 };
    default: return { wins: 0, losses: 0 };
  }
};

interface AllTimePlayerStats {
  userId: string;
  ffuUserId: string;
  userInfo: UserInfo;
  totalWins: number;
  totalLosses: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  thirdPlaceFinishes: number;
  lastPlaceFinishes: number;
  playoffAppearances: number;
  playoffWins: number;
  playoffLosses: number;
  winPercentage: number;
  averageSeasonRank: number;
  pointDifferential: number;
  averagePointsPerGame: number;
  careerHighGame: number;
  careerLowGame: number;
  seasonsPlayed: number;
  premierSeasons: number;
  mastersSeasons: number;
  nationalSeasons: number;
  averageUPR: number;
  seasonHistory: {
    year: string;
    league: string;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
    unionPowerRating?: number;
  }[];
}

export const AllTimeStats = () => {
  const { data: standings, isLoading, error } = useAllStandings();

  const { getParam, getBooleanParam, updateParams } = useUrlParams();

  // Initialize state with defaults
  const [activeView, setActiveView] = useState<'career' | 'season' | 'horserace'>('career');
  const [showMinThreeSeasons, setShowMinThreeSeasons] = useState(false);
  const [allTimeSortKey, setAllTimeSortKey] = useState<AllTimeSortKey>('winPercentage');
  const [allTimeSortOrder, setAllTimeSortOrder] = useState<SortOrder>('desc');
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [seasonSortKey, setSeasonSortKey] = useState<SeasonHistorySortKey>('year');
  const [seasonSortOrder, setSeasonSortOrder] = useState<SortOrder>('desc');
  const [horseraceLeague, setHorseraceLeague] = useState<LeagueTier>('PREMIER');
  const [horseraceYear, setHorseraceYear] = useState<string>('2024');

  // Initialize from URL params on mount
  useEffect(() => {
    const view = getParam('view', 'career');
    if (['career', 'season', 'horserace'].includes(view)) {
      setActiveView(view as 'career' | 'season' | 'horserace');
    }

    setShowMinThreeSeasons(getBooleanParam('minThreeSeasons', false));

    const sortKey = getParam('sortKey', 'winPercentage');
    const validKeys: AllTimeSortKey[] = ['teamName', 'totalWins', 'totalLosses', 'winPercentage', 'playoffWins', 'playoffLosses', 'totalPointsFor', 'totalPointsAgainst', 'pointDifferential', 'averagePointsPerGame', 'careerHighGame', 'careerLowGame', 'firstPlaceFinishes', 'secondPlaceFinishes', 'thirdPlaceFinishes', 'lastPlaceFinishes', 'seasonsPlayed', 'premierSeasons', 'mastersSeasons', 'nationalSeasons', 'averageSeasonRank', 'averageUPR'];
    if (validKeys.includes(sortKey as AllTimeSortKey)) {
      setAllTimeSortKey(sortKey as AllTimeSortKey);
    }

    const order = getParam('sortOrder', 'desc');
    setAllTimeSortOrder(order === 'asc' ? 'asc' : 'desc');

    const league = getParam('league', 'ALL');
    if (['ALL', 'PREMIER', 'MASTERS', 'NATIONAL'].includes(league)) {
      setSelectedLeague(league as LeagueTier | 'ALL');
    }

    setSelectedYear(getParam('year', 'ALL'));

    const seasonSortKey = getParam('seasonSortKey', 'year');
    const validSeasonKeys: SeasonHistorySortKey[] = ['team', 'year', 'league', 'record', 'pointsFor', 'avgPPG', 'pointsAgainst', 'placement', 'upr'];
    if (validSeasonKeys.includes(seasonSortKey as SeasonHistorySortKey)) {
      setSeasonSortKey(seasonSortKey as SeasonHistorySortKey);
    }

    const seasonOrder = getParam('seasonSortOrder', 'desc');
    setSeasonSortOrder(seasonOrder === 'asc' ? 'asc' : 'desc');

    const horseLeague = getParam('horseraceLeague', 'PREMIER');
    if (['PREMIER', 'MASTERS', 'NATIONAL'].includes(horseLeague)) {
      setHorseraceLeague(horseLeague as LeagueTier);
    }

    setHorseraceYear(getParam('horseraceYear', '2024'));
  }, []); // Empty dependency array - only run on mount

  // Mobile touch state for showing full team names
  const [touchedTeamCell, setTouchedTeamCell] = useState<string | null>(null);

  // Touch handlers for mobile team name display
  const handleTeamCellTouch = (teamId: string, teamName: string) => {
    setTouchedTeamCell(`${teamId}-${teamName}`);
    // Auto-hide after 2 seconds
    setTimeout(() => setTouchedTeamCell(null), 2000);
  };

  const leagues: (LeagueTier | 'ALL')[] = ['ALL', 'PREMIER', 'MASTERS', 'NATIONAL'];
  const years = ['ALL', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];
  const validYearsByLeague: Record<string, string[]> = {
    ALL: years,
    PREMIER: years,
    NATIONAL: years,
    MASTERS: ['ALL', '2024', '2023', '2022'], // no 2021, 2020
  };

  const filteredYears = useMemo(() => {
    return validYearsByLeague[selectedLeague] || years;
  }, [selectedLeague]);

  useEffect(() => {
    if (!filteredYears.includes(selectedYear)) {
      setSelectedYear('ALL');
    }
  }, [selectedLeague, filteredYears, selectedYear]);

  const getLeagueName = (league: LeagueTier | 'ALL'): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
      case 'ALL': return 'All Leagues';
    }
  };

  // All Time Stats handlers
  const handleAllTimeSort = (key: AllTimeSortKey) => {
    let newOrder: SortOrder;
    if (allTimeSortKey === key) {
      newOrder = allTimeSortOrder === 'asc' ? 'desc' : 'asc';
      setAllTimeSortOrder(newOrder);
    } else {
      setAllTimeSortKey(key);
      newOrder = 'desc';
      setAllTimeSortOrder('desc');
    }
    updateParams({ sortKey: key, sortOrder: newOrder });
  };

  const getAllTimeSortValue = (player: AllTimePlayerStats, key: AllTimeSortKey) => {
    switch (key) {
      case 'teamName':
        return player.userInfo.teamName.toLowerCase();
      default:
        return player[key];
    }
  };

  // Season History handlers
  const handleSeasonSort = (key: SeasonHistorySortKey) => {
    let newOrder: SortOrder;
    if (seasonSortKey === key) {
      newOrder = seasonSortOrder === 'asc' ? 'desc' : 'asc';
      setSeasonSortOrder(newOrder);
    } else {
      setSeasonSortKey(key);
      newOrder = 'desc';
      setSeasonSortOrder('desc');
    }
    updateParams({ seasonSortKey: key, seasonSortOrder: newOrder });
  };

  const getSeasonSortValue = (season: any, key: SeasonHistorySortKey) => {
    switch (key) {
      case 'team':
        return season.userInfo.teamName.toLowerCase();
      case 'year':
        return season.year;
      case 'league':
        const leagueOrder: Record<string, number> = { 'PREMIER': 1, 'MASTERS': 2, 'NATIONAL': 3 };
        return leagueOrder[season.league] || 4;
      case 'record':
        return season.wins; // Use wins as sort key for records
      case 'pointsFor':
        return season.pointsFor;
      case 'avgPPG':
        return season.avgPointsPerGame;
      case 'pointsAgainst':
        return season.pointsAgainst;
      case 'placement':
        return season.playoffFinish || season.rank;
      case 'upr':
        return season.unionPowerRating || 0;
      default:
        return 0;
    }
  };

  const allTimeStats = useMemo(() => {
    if (!standings.length) return [];

    const playerMap: Record<string, AllTimePlayerStats> = {};

    // Process all standings data
    standings.forEach(leagueData => {
      leagueData.standings.forEach(standing => {
        // Use FFU ID as primary key, with robust fallback logic
        let playerId = standing.ffuUserId;

        // If no FFU ID, try to convert from legacy user ID
        if (!playerId || playerId === 'unknown') {
          playerId = getFFUIdBySleeperId(standing.userId) || standing.userId;
        }

        if (!playerMap[playerId]) {
          playerMap[playerId] = {
            userId: standing.userId,
            ffuUserId: standing.ffuUserId || standing.userId,
            userInfo: standing.userInfo,
            totalWins: 0,
            totalLosses: 0,
            totalPointsFor: 0,
            totalPointsAgainst: 0,
            firstPlaceFinishes: 0,
            secondPlaceFinishes: 0,
            thirdPlaceFinishes: 0,
            lastPlaceFinishes: 0,
            playoffAppearances: 0,
            playoffWins: 0,
            playoffLosses: 0,
            winPercentage: 0,
            averageSeasonRank: 0,
            pointDifferential: 0,
            averagePointsPerGame: 0,
            careerHighGame: 0,
            careerLowGame: Number.MAX_VALUE,
            seasonsPlayed: 0,
            premierSeasons: 0,
            mastersSeasons: 0,
            nationalSeasons: 0,
            averageUPR: 0,
            seasonHistory: []
          };
        }

        const player = playerMap[playerId];

        // Accumulate totals
        player.totalWins += standing.wins;
        player.totalLosses += standing.losses;
        player.totalPointsFor += standing.pointsFor || 0;
        player.totalPointsAgainst += standing.pointsAgainst || 0;
        player.seasonsPlayed += 1;

        // Track career high and low games
        if (standing.highGame && standing.highGame > player.careerHighGame) {
          player.careerHighGame = standing.highGame;
        }
        if (standing.lowGame && standing.lowGame < player.careerLowGame) {
          player.careerLowGame = standing.lowGame;
        }

        // Count league tier appearances
        if (leagueData.league === 'PREMIER') player.premierSeasons++;
        else if (leagueData.league === 'MASTERS') player.mastersSeasons++;
        else if (leagueData.league === 'NATIONAL') player.nationalSeasons++;

        // Count finishes
        if (standing.rank === 1) player.firstPlaceFinishes++;
        else if (standing.rank === 2) player.secondPlaceFinishes++;
        else if (standing.rank === 3) player.thirdPlaceFinishes++;
        else if (standing.rank === leagueData.standings.length) player.lastPlaceFinishes++;

        // Check for playoff appearance (rank 6 or better = playoff berth)
        if (standing.rank <= 6) {
          player.playoffAppearances++;

          // Use playoff results if available, otherwise use regular season rank
          const playoffFinish = leagueData.playoffResults?.find(p =>
            (p.ffuUserId && p.ffuUserId === standing.ffuUserId) ||
            (p.userId === standing.userId)
          );

          const finalPlacement = playoffFinish ? playoffFinish.placement : standing.rank;
          const { wins, losses } = calculatePlayoffRecord(finalPlacement);
          player.playoffWins += wins;
          player.playoffLosses += losses;
        }

        // Add to season history
        const playoffFinish = leagueData.playoffResults?.find(p =>
          (p.ffuUserId && p.ffuUserId === standing.ffuUserId) ||
          (p.userId === standing.userId)
        );

        player.seasonHistory.push({
          year: leagueData.year,
          league: leagueData.league,
          wins: standing.wins,
          losses: standing.losses,
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          playoffFinish: standing.rank <= 6 ? (playoffFinish?.placement || standing.rank) : undefined,
          unionPowerRating: standing.unionPowerRating
        });
      });
    });

    // Calculate derived stats for each player (like PlayerStats component)
    Object.values(playerMap).forEach(player => {
      // Sort season history by year (newest first)
      player.seasonHistory.sort((a, b) => b.year.localeCompare(a.year));

      // Calculate win percentage
      const totalGames = player.totalWins + player.totalLosses;
      player.winPercentage = totalGames > 0 ? (player.totalWins / totalGames) * 100 : 0;

      // Calculate average points per game
      player.averagePointsPerGame = totalGames > 0 ? player.totalPointsFor / totalGames : 0;

      // Calculate point differential
      player.pointDifferential = player.totalPointsFor - player.totalPointsAgainst;

      // Handle case where no low game was found
      if (player.careerLowGame === Number.MAX_VALUE) {
        player.careerLowGame = 0;
      }

      // Calculate average season rank (same as PlayerStats component)
      if (player.seasonHistory.length > 0) {
        const totalRank = player.seasonHistory.reduce((sum, season) => sum + season.rank, 0);
        player.averageSeasonRank = totalRank / player.seasonHistory.length;
        
        // Calculate average UPR
        const validUPRSeasons = player.seasonHistory.filter(season => season.unionPowerRating !== undefined);
        if (validUPRSeasons.length > 0) {
          const totalUPR = validUPRSeasons.reduce((sum, season) => sum + (season.unionPowerRating || 0), 0);
          player.averageUPR = totalUPR / validUPRSeasons.length;
        }
      }
    });

    return Object.values(playerMap);
  }, [standings]);

  const sortedAllTimeStats = useMemo(() => {
    let filteredStats = allTimeStats;
    
    // Filter by minimum seasons if checkbox is checked
    if (showMinThreeSeasons) {
      filteredStats = allTimeStats.filter(player => player.seasonsPlayed >= 3);
    }
    
    return [...filteredStats].sort((a, b) => {
      const aValue = getAllTimeSortValue(a, allTimeSortKey);
      const bValue = getAllTimeSortValue(b, allTimeSortKey);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return allTimeSortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return allTimeSortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [allTimeStats, allTimeSortKey, allTimeSortOrder, showMinThreeSeasons]);

  const filteredSeasonHistory = useMemo(() => {
    if (!standings.length) return [];

    const filtered = standings.filter(leagueData => {
      if (selectedLeague !== 'ALL' && leagueData.league !== selectedLeague) return false;
      if (selectedYear !== 'ALL' && leagueData.year !== selectedYear) return false;
      return true;
    });

    const seasonEntries = filtered.flatMap(leagueData =>
      leagueData.standings.map(standing => {
        const totalGames = standing.wins + standing.losses;
        const avgScore = totalGames > 0 ? (standing.pointsFor || 0) / totalGames : 0;

        return {
          userId: standing.userId,
          userInfo: standing.userInfo,
          year: leagueData.year,
          league: leagueData.league as LeagueTier,
          wins: standing.wins,
          losses: standing.losses,
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          avgPointsPerGame: avgScore,
          unionPowerRating: standing.unionPowerRating,
          playoffFinish: leagueData.playoffResults?.find(p => p.userId === standing.userId)?.placement
        };
      })
    );

    return seasonEntries.sort((a, b) => {
      const aValue = getSeasonSortValue(a, seasonSortKey);
      const bValue = getSeasonSortValue(b, seasonSortKey);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return seasonSortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = (aValue as number) - (bValue as number);
        return seasonSortOrder === 'asc' ? comparison : -comparison;
      }
    });
  }, [standings, selectedLeague, selectedYear, seasonSortKey, seasonSortOrder]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Cumulative Career Stats</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Career statistics across all seasons and leagues</p>
        </div>

        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <div className="mt-4 text-gray-500 dark:text-gray-400">
            Loading statistics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          Statistics
        </h1>

        {/* View Toggle Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => {
                  setActiveView('career');
                  updateParams({ view: 'career' });
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === 'career'
                    ? 'border-ffu-red text-ffu-red dark:text-ffu-red'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Career Stats
              </button>
              <button
                onClick={() => {
                  setActiveView('season');
                  updateParams({ view: 'season' });
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === 'season'
                    ? 'border-ffu-red text-ffu-red dark:text-ffu-red'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Season History
              </button>
              <button
                onClick={() => {
                  setActiveView('horserace');
                  updateParams({ view: 'horserace' });
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeView === 'horserace'
                    ? 'border-ffu-red text-ffu-red dark:text-ffu-red'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                UPR Horserace
              </button>
            </nav>
          </div>
        </div>
      </div>


      {/* Cumulative Career Stats Table */}
      {activeView === 'career' && (
        <div style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }} className="px-4 sm:px-6 lg:px-8">
          <div className="card">
            <div className="mb-4">
              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  Career Statistics
                  <span className="ml-3 text-lg font-bold text-gray-500 dark:text-gray-400">
                    ({sortedAllTimeStats.length} members)
                  </span>
                </h2>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-ffu-red transition-colors duration-200">
                    Show only members with 3+ seasons
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showMinThreeSeasons}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowMinThreeSeasons(checked);
                        updateParams({ minThreeSeasons: checked ? 'true' : null });
                      }}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded transition-all duration-200 ${
                      showMinThreeSeasons 
                        ? 'bg-ffu-red border-ffu-red' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-ffu-red dark:hover:border-ffu-red'
                    }`}>
                      {showMinThreeSeasons && (
                        <svg className="w-3 h-3 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </label>
              </div>
              
              {/* Mobile Layout */}
              <div className="sm:hidden space-y-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Career Statistics
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {sortedAllTimeStats.length} members
                  </p>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showMinThreeSeasons}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowMinThreeSeasons(checked);
                        updateParams({ minThreeSeasons: checked ? 'true' : null });
                      }}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border-2 rounded transition-all duration-200 ${
                      showMinThreeSeasons 
                        ? 'bg-ffu-red border-ffu-red' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-ffu-red dark:hover:border-ffu-red'
                    }`}>
                      {showMinThreeSeasons && (
                        <svg className="w-2.5 h-2.5 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 group-hover:text-ffu-red transition-colors duration-200">
                    3+ seasons only
                  </span>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto table-container">
              <table className="table md:table-fixed w-full min-w-[1400px]">
                <colgroup className="hidden md:table-column-group">
                  <col className="w-[12%]" />
                  <col className="w-[5%]" />
                  <col className="w-[4%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                  <col className="w-[6%]" />
                  <col className="w-[4%]" />
                  <col className="w-[4%]" />
                  <col className="w-[5%]" />
                  <col className="w-[4%]" />
                  <col className="w-[4%]" />
                </colgroup>
                <thead className="table-header">
                  <tr>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none sticky left-0 z-10 bg-ffu-red dark:bg-ffu-red-800 pl-2"
                      onClick={() => handleAllTimeSort('teamName')}
                    >
                      <div className="flex items-center justify-between text-xs">
                        Team
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'teamName' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'teamName' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('totalWins')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Record
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'totalWins' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'totalWins' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('winPercentage')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Win %
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'winPercentage' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'winPercentage' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('playoffWins')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Playoff Rec
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'playoffWins' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'playoffWins' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('totalPointsFor')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Points For
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'totalPointsFor' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'totalPointsFor' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('totalPointsAgainst')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Points Agst
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'totalPointsAgainst' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'totalPointsAgainst' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('pointDifferential')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Point Diff
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'pointDifferential' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'pointDifferential' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('averagePointsPerGame')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Avg PPG
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'averagePointsPerGame' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'averagePointsPerGame' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('careerHighGame')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        High Game
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'careerHighGame' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'careerHighGame' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('careerLowGame')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Low Game
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'careerLowGame' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'careerLowGame' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('firstPlaceFinishes')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Podium
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'firstPlaceFinishes' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'firstPlaceFinishes' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('lastPlaceFinishes')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Last
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'lastPlaceFinishes' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'lastPlaceFinishes' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('seasonsPlayed')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Seasons
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'seasonsPlayed' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'seasonsPlayed' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('premierSeasons')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Tiers
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'premierSeasons' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'premierSeasons' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('averageSeasonRank')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Avg Rank
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'averageSeasonRank' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'averageSeasonRank' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                    <th
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                      onClick={() => handleAllTimeSort('averageUPR')}
                    >
                      <div className="flex items-center justify-center text-xs">
                        Avg UPR
                        <div className="flex flex-col ml-1">
                          <ChevronUp className={`h-3 w-3 ${allTimeSortKey === 'averageUPR' && allTimeSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${allTimeSortKey === 'averageUPR' && allTimeSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAllTimeStats.map((player) => (
                    <tr key={player.ffuUserId} className="table-row h-12">
                      <td className="align-middle sticky left-0 z-10 bg-white dark:bg-[#121212] w-16 sm:w-auto pl-2">
                        <div className="flex sm:hidden items-center justify-center h-full relative">
                          <div 
                            className="text-center cursor-pointer select-none"
                            onTouchStart={() => handleTeamCellTouch(player.ffuUserId, player.userInfo.teamName)}
                            onClick={() => handleTeamCellTouch(player.ffuUserId, player.userInfo.teamName)}
                          >
                            <TeamLogo
                              teamName={player.userInfo.teamName}
                              size="sm"
                              className="mx-auto mb-1 !w-8 !h-8"
                            />
                            <div className="text-xs text-gray-900 dark:text-gray-100 font-mono uppercase font-medium">
                              {player.userInfo.abbreviation}
                            </div>
                          </div>
                          {/* Mobile tooltip for full team name */}
                          {touchedTeamCell === `${player.ffuUserId}-${player.userInfo.teamName}` && (
                            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
                              {player.userInfo.teamName}
                              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                            </div>
                          )}
                        </div>
                        <div className="hidden sm:flex items-center space-x-1 h-full">
                          <TeamLogo
                            teamName={player.userInfo.teamName}
                            size="sm"
                            className="flex-shrink-0 !w-6 !h-6"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100 text-xs leading-tight break-words">
                              {player.userInfo.teamName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase">
                              {player.userInfo.abbreviation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono">{player.totalWins}-{player.totalLosses}</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono">{player.winPercentage.toFixed(1)}%</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono">{player.playoffWins}-{player.playoffLosses}</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono">{player.totalPointsFor.toFixed(2)}</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono">{player.totalPointsAgainst.toFixed(2)}</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className={`text-sm font-medium font-mono ${player.pointDifferential > 0 ? 'text-green-600' : player.pointDifferential < 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                          {player.pointDifferential > 0 ? '+' : ''}{player.pointDifferential.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 font-mono">
                          {player.averagePointsPerGame.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono text-green-600 dark:text-green-400">
                          {player.careerHighGame.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono text-red-600 dark:text-red-400">
                          {player.careerLowGame.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        <div className="text-xs space-y-0.5">
                          {player.firstPlaceFinishes > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <Trophy className="h-3 w-3 text-yellow-600" />
                              <span className="font-medium">{player.firstPlaceFinishes}</span>
                            </div>
                          )}
                          {player.secondPlaceFinishes > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <Medal className="h-3 w-3 text-gray-500" />
                              <span className="font-medium">{player.secondPlaceFinishes}</span>
                            </div>
                          )}
                          {player.thirdPlaceFinishes > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <Award className="h-3 w-3 text-amber-600" />
                              <span className="font-medium">{player.thirdPlaceFinishes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-center align-middle">
                        <div className="flex items-center justify-center space-x-1">
                          {player.lastPlaceFinishes > 0 && <TrendingDown className="h-3 w-3 text-gray-400" />}
                          <span className="text-sm font-medium">{player.lastPlaceFinishes}</span>
                        </div>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium">{player.seasonsPlayed}</span>
                      </td>
                      <td className="text-center align-middle">
                        <div className="text-xs space-y-0.5">
                          {player.premierSeasons > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <span className="premier-colors px-1 py-0.5 rounded text-xs font-bold">P</span>
                              <span className="font-medium">{player.premierSeasons}</span>
                            </div>
                          )}
                          {player.mastersSeasons > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <span className="masters-colors px-1 py-0.5 rounded text-xs font-bold">M</span>
                              <span className="font-medium">{player.mastersSeasons}</span>
                            </div>
                          )}
                          {player.nationalSeasons > 0 && (
                            <div className="flex items-center justify-center space-x-1">
                              <span className="national-colors px-1 py-0.5 rounded text-xs font-bold">N</span>
                              <span className="font-medium">{player.nationalSeasons}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium">#{player.averageSeasonRank.toFixed(1)}</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="text-sm font-medium font-mono">
                          {player.averageUPR ? player.averageUPR.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}

      {/* Season History Table */}
      {activeView === 'season' && (
        <div style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }} className="px-4 sm:px-6 lg:px-8">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                Single Season History
                <span className="ml-3 text-lg font-bold text-gray-500 dark:text-gray-400">
                  ({filteredSeasonHistory.length} total)
                </span>
              </h2>
            </div>
            <>
              {/* Filters */}
              <div className="flex flex-row gap-2 sm:gap-4 items-center w-full mb-6">
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-shrink">
                  <div className="relative">
                    <select
                      value={selectedLeague}
                      onChange={(e) => {
                        const league = e.target.value as LeagueTier | 'ALL';
                        setSelectedLeague(league);
                        updateParams({ league: league === 'ALL' ? null : league });
                      }}
                      className="block w-28 sm:w-full pl-2 sm:pl-4 pr-6 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base font-medium bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                    >
                      {leagues.map(league => (
                        <option key={league} value={league}>{getLeagueName(league)}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-3 pointer-events-none">
                      <ChevronDown className="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2 min-w-0 flex-shrink">
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        const year = e.target.value;
                        setSelectedYear(year);
                        updateParams({ year: year === 'ALL' ? null : year });
                      }}
                      className="block w-20 sm:w-full pl-2 sm:pl-4 pr-6 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base font-medium bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                    >
                      {filteredYears.map(year => (
                        <option key={year} value={year}>{year === 'ALL' ? 'All Years' : year}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-3 pointer-events-none">
                      <ChevronDown className="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto table-container">
                <table className="table md:table-fixed w-full min-w-[800px]">
                  <colgroup className="hidden md:table-column-group">
                    <col className="w-[18%]" />
                    <col className="w-[7%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="table-header">
                    <tr>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none sticky left-0 z-10 bg-ffu-red dark:bg-ffu-red-800 pl-2"
                        onClick={() => handleSeasonSort('team')}
                      >
                        <div className="flex items-center justify-between text-xs">
                          Team
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'team' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'team' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('year')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Year
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'year' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'year' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('league')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          League
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'league' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'league' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('record')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Record
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'record' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'record' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('pointsFor')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Points For
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'pointsFor' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'pointsFor' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('avgPPG')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Avg PPG
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'avgPPG' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'avgPPG' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('pointsAgainst')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Points Against
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'pointsAgainst' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'pointsAgainst' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('upr')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          UPR
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'upr' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'upr' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none px-1"
                        onClick={() => handleSeasonSort('placement')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Placement
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${seasonSortKey === 'placement' && seasonSortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${seasonSortKey === 'placement' && seasonSortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeasonHistory.map((season) => (
                      <tr key={`${season.userId}-${season.year}-${season.league}`} className="table-row h-12">
                        <td className="align-middle sticky left-0 z-10 bg-white dark:bg-[#121212] w-16 sm:w-auto pl-2">
                          <div className="flex sm:hidden items-center justify-center h-full relative">
                            <div 
                              className="text-center cursor-pointer select-none"
                              onTouchStart={() => handleTeamCellTouch(season.userId, season.userInfo.teamName)}
                              onClick={() => handleTeamCellTouch(season.userId, season.userInfo.teamName)}
                            >
                              <TeamLogo
                                teamName={season.userInfo.teamName}
                                size="sm"
                                className="mx-auto mb-1 !w-8 !h-8"
                              />
                              <div className="text-xs text-gray-900 dark:text-gray-100 font-mono uppercase font-medium">
                                {season.userInfo.abbreviation}
                              </div>
                            </div>
                            {/* Mobile tooltip for full team name */}
                            {touchedTeamCell === `${season.userId}-${season.userInfo.teamName}` && (
                              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
                                {season.userInfo.teamName}
                                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                              </div>
                            )}
                          </div>
                          <div className="hidden sm:flex items-center space-x-1 h-full">
                            <TeamLogo
                              teamName={season.userInfo.teamName}
                              size="sm"
                              className="flex-shrink-0 !w-6 !h-6"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-xs leading-tight break-words">
                                {season.userInfo.teamName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase">
                                {season.userInfo.abbreviation}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium">{season.year}</span>
                        </td>
                        <td className="text-center align-middle">
                          <LeagueBadge league={season.league} />
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">{season.wins}-{season.losses}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">{season.pointsFor.toFixed(2)}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 font-mono">
                            {season.avgPointsPerGame.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">{season.pointsAgainst.toFixed(2)}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">
                            {season.unionPowerRating ? season.unionPowerRating.toFixed(2) : 'N/A'}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          {season.playoffFinish ? (
                            <div className="flex items-center justify-center space-x-1">
                              {season.playoffFinish === 1 && <Trophy className="h-3 w-3 text-yellow-600" />}
                              {season.playoffFinish === 2 && <Award className="h-3 w-3 text-gray-500" />}
                              {season.playoffFinish === 3 && <Award className="h-3 w-3 text-amber-600" />}
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {season.playoffFinish === 1 ? '1st' :
                                    season.playoffFinish === 2 ? '2nd' :
                                      season.playoffFinish === 3 ? '3rd' :
                                        `${season.playoffFinish}th`}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              {season.rank === 1 && <Trophy className="h-3 w-3 text-yellow-600" />}
                              {season.rank === 2 && <Award className="h-3 w-3 text-gray-500" />}
                              {season.rank === 3 && <Award className="h-3 w-3 text-amber-600" />}
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {season.rank === 1 ? '1st' :
                                    season.rank === 2 ? '2nd' :
                                      season.rank === 3 ? '3rd' :
                                        `${season.rank}th`}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          </div>
        </div>
      )}

      {/* UPR Horserace View */}
      {activeView === 'horserace' && (
        <div style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }} className="px-4 sm:px-6 lg:px-8">
          <UPRHorserace 
            league={horseraceLeague} 
            year={horseraceYear}
            onLeagueChange={(league) => {
              setHorseraceLeague(league);
              updateParams({ horseraceLeague: league });
            }}
            onYearChange={(year) => {
              setHorseraceYear(year);
              updateParams({ horseraceYear: year });
            }}
          />
        </div>
      )}
    </div>
  );
};