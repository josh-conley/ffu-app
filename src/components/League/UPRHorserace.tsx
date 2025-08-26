import { useState, useEffect, useRef } from 'react';
import { useAllStandings } from '../../hooks/useLeagues';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { ErrorMessage } from '../Common/ErrorMessage';
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';
import { getDisplayTeamName } from '../../config/constants';
import { TeamLogo } from '../Common/TeamLogo';
import { isRegularSeasonWeek } from '../../utils/era-detection';
import { leagueApi } from '../../services/api';
import { calculateUPR } from '../../utils/upr-calculator';
import type { LeagueTier, UserInfo } from '../../types';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';

interface WeeklyUPRData {
  week: number;
  upr: number;
  wins: number;
  losses: number;
}

interface TeamUPRProgress {
  userId: string;
  userInfo: UserInfo;
  weeklyData: WeeklyUPRData[];
  color: string;
  finalUPR: number;
}

interface UPRHorseraceProps {
  league: LeagueTier;
  year: string;
  onLeagueChange: (league: LeagueTier) => void;
  onYearChange: (year: string) => void;
}

const TEAM_COLORS = [
  '#EF4444', // red-500
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
  '#F43F5E', // rose-500
];

export const UPRHorserace = ({ league, year, onLeagueChange, onYearChange }: UPRHorseraceProps) => {
  // Valid years by league - matches the logic from AllTimeStats
  const validYearsByLeague: Record<string, string[]> = {
    PREMIER: ['2024', '2023', '2022', '2021', '2020', '2019', '2018'],
    NATIONAL: ['2024', '2023', '2022', '2021', '2020', '2019', '2018'],
    MASTERS: ['2024', '2023', '2022'], // Masters started in 2022
  };
  const { data: allStandings, isLoading: standingsLoading, error: standingsError } = useAllStandings();
  const [teamData, setTeamData] = useState<TeamUPRProgress[]>([]);
  const { openTeamProfile } = useTeamProfileModal();
  const [currentWeek, setCurrentWeek] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get valid years for current league
  const validYears = validYearsByLeague[league] || [];
  
  // Get current league standings to determine teams
  const leagueStandings = allStandings?.find(s => s.league === league && s.year === year);
  const maxWeek = year === '2024' ? 14 : (parseInt(year) >= 2021 ? 14 : 13); // Era-aware week count
  

  useEffect(() => {
    if (leagueStandings) {
      loadTeamProgressData();
    }
  }, [leagueStandings, league, year]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= maxWeek) {
            setIsPlaying(false);
            return maxWeek;
          }
          return prev + 1;
        });
      }, 500); // Update every 500ms for smooth animation
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, maxWeek]);

  const loadTeamProgressData = async () => {
    if (!leagueStandings) return;

    setIsLoading(true);
    setError(undefined);

    try {
      // Get all matchups for the season
      const allMatchups = await leagueApi.getAllSeasonMatchups(league, year);
      
      // Initialize team progress data
      const teamProgress: Record<string, TeamUPRProgress> = {};
      
      leagueStandings.standings.forEach((standing, index) => {
        teamProgress[standing.userId] = {
          userId: standing.userId,
          userInfo: standing.userInfo,
          weeklyData: [],
          color: TEAM_COLORS[index % TEAM_COLORS.length],
          finalUPR: standing.unionPowerRating || 0
        };
      });

      // Calculate progressive UPR for each week
      for (let week = 1; week <= maxWeek; week++) {
        if (!isRegularSeasonWeek(week, year)) continue;

        // Get matchups up to this week
        const matchupsUpToWeek = allMatchups
          .filter((weekData: any) => weekData.week <= week)
          .flatMap((weekData: any) => weekData.matchups);

        // Calculate stats for each team through this week
        Object.keys(teamProgress).forEach(userId => {
          let wins = 0;
          let losses = 0;
          const scores: number[] = [];
          let highGame = 0;
          let lowGame = Number.MAX_SAFE_INTEGER;

          matchupsUpToWeek.forEach((matchup: any) => {
            if (matchup.winner === userId) {
              wins++;
              scores.push(matchup.winnerScore);
              highGame = Math.max(highGame, matchup.winnerScore);
              lowGame = Math.min(lowGame, matchup.winnerScore);
            } else if (matchup.loser === userId) {
              losses++;
              scores.push(matchup.loserScore);
              highGame = Math.max(highGame, matchup.loserScore);
              lowGame = Math.min(lowGame, matchup.loserScore);
            }
          });

          const averageScore = scores.length > 0 
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
            : 0;

          const upr = calculateUPR({
            wins,
            losses,
            averageScore,
            highGame: highGame > 0 ? highGame : 0,
            lowGame: lowGame < Number.MAX_SAFE_INTEGER ? lowGame : 0
          });

          teamProgress[userId].weeklyData.push({
            week,
            upr,
            wins,
            losses
          });
        });
      }

      setTeamData(Object.values(teamProgress).sort((a, b) => b.finalUPR - a.finalUPR));
    } catch (err) {
      console.error('Error loading team progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load UPR progression data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
    if (currentWeek >= maxWeek) {
      setCurrentWeek(4);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentWeek(4);
  };

  if (standingsLoading || isLoading) {
    return (
      <div className="card">
        <div className="flex justify-center items-center min-h-64">
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  if (standingsError || error) {
    return <ErrorMessage error={standingsError || error || 'Unknown error'} />;
  }

  if (!leagueStandings || teamData.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            No UPR progression data available for {league} {year}
          </div>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions and scales - make responsive
  const chartWidth = Math.min(800, windowWidth - 100);
  const chartHeight = 500; // Fixed height to match rankings
  const padding = { 
    top: 20, 
    right: chartWidth > 600 ? 80 : 40, 
    bottom: 60, 
    left: chartWidth > 600 ? 60 : 40 
  };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Fixed UPR scale from 80 to 200
  const minUPR = 80;
  const maxUPR = 200;
  const uprRange = maxUPR - minUPR;

  const xScale = (week: number) => (week - 4) / (maxWeek - 4) * innerWidth;
  const yScale = (upr: number) => innerHeight - ((upr - minUPR) / uprRange) * innerHeight;

  // Get current week data for rankings
  const currentWeekData = teamData
    .map(team => ({
      ...team,
      currentUPR: team.weeklyData.find(d => d.week === Math.min(currentWeek, team.weeklyData.length))?.upr || 0
    }))
    .sort((a, b) => b.currentUPR - a.currentUPR);

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-wide">
              UPR Horserace
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Progressive UPR calculation throughout the regular season
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-row gap-2 items-center">
            <div className="relative">
              <select
                value={league}
                onChange={(e) => onLeagueChange(e.target.value as LeagueTier)}
                className="block w-28 pl-2 pr-6 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                <option value="PREMIER">Premier</option>
                <option value="MASTERS">Masters</option>
                <option value="NATIONAL">National</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </div>
            </div>

            <div className="relative">
              <select
                value={year}
                onChange={(e) => onYearChange(e.target.value)}
                className="block w-20 pl-2 pr-6 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {validYears.map(yearOption => (
                  <option key={yearOption} value={yearOption}>{yearOption}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="btn-secondary p-2"
            disabled={isLoading}
            title="Reset to Week 4"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="btn-primary p-2"
            disabled={isLoading}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Week {currentWeek}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Chart */}
        <div className="flex-1 lg:flex-[3]">
          <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-4 rounded-lg overflow-hidden">
            <svg 
              width={chartWidth} 
              height={chartHeight} 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto max-w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x={padding.left} y={padding.top} width={innerWidth} height={innerHeight} fill="url(#grid)" />

              {/* Y-axis */}
              <g>
                {Array.from({ length: 6 }, (_, i) => {
                  const value = minUPR + uprRange * i / 5;
                  const y = padding.top + yScale(value);
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + innerWidth}
                        y2={y}
                        stroke="#d1d5db"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 5}
                        y={y + 3}
                        textAnchor="end"
                        className={`${chartWidth > 600 ? 'text-xs' : 'text-[10px]'} fill-gray-600 dark:fill-gray-300`}
                        fontSize={chartWidth > 600 ? 12 : 10}
                      >
                        {value.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* X-axis */}
              <g>
                {Array.from({ length: Math.min(currentWeek, maxWeek) - 3 }, (_, i) => {
                  const week = i + 4;
                  if (week > currentWeek) return null;
                  
                  const shouldShow = chartWidth > 600 ? 
                    (week % 2 === 0 || week === currentWeek) : 
                    (week % 4 === 0 || week === currentWeek || week === maxWeek);
                  
                  if (shouldShow) {
                    const x = padding.left + xScale(week);
                    return (
                      <text
                        key={week}
                        x={x}
                        y={chartHeight - padding.bottom + 15}
                        textAnchor="middle"
                        className={`${chartWidth > 600 ? 'text-xs' : 'text-[10px]'} fill-gray-600 dark:fill-gray-300`}
                        fontSize={chartWidth > 600 ? 12 : 10}
                      >
                        {week}
                      </text>
                    );
                  }
                  return null;
                })}
              </g>

              {/* Team lines */}
              {teamData.map(team => {
                const dataPoints = team.weeklyData.slice(0, currentWeek).filter(d => d.week >= 4);
                if (dataPoints.length < 2) return null;

                const pathData = dataPoints.map((d, i) => {
                  const x = padding.left + xScale(d.week);
                  const y = padding.top + yScale(d.upr);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                const isHovered = hoveredTeam === team.userId;

                return (
                  <g key={team.userId}>
                    {/* Invisible wider line for easier hovering */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredTeam(team.userId)}
                      onMouseLeave={() => setHoveredTeam(null)}
                    />
                    
                    {/* Visible line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={team.color}
                      strokeWidth={isHovered ? "4" : "3"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ 
                        cursor: 'pointer',
                        opacity: hoveredTeam && !isHovered ? 0.3 : 1
                      }}
                      onMouseEnter={() => setHoveredTeam(team.userId)}
                      onMouseLeave={() => setHoveredTeam(null)}
                    />
                    
                    {/* Current point */}
                    {dataPoints.length > 0 && (
                      <circle
                        cx={padding.left + xScale(dataPoints[dataPoints.length - 1].week)}
                        cy={padding.top + yScale(dataPoints[dataPoints.length - 1].upr)}
                        r={isHovered ? "6" : "5"}
                        fill={team.color}
                        stroke="white"
                        strokeWidth="2"
                        style={{ 
                          cursor: 'pointer',
                          opacity: hoveredTeam && !isHovered ? 0.3 : 1
                        }}
                        onMouseEnter={() => setHoveredTeam(team.userId)}
                        onMouseLeave={() => setHoveredTeam(null)}
                      />
                    )}
                    
                    {/* Hover tooltip */}
                    {isHovered && dataPoints.length > 0 && (() => {
                      const pointX = padding.left + xScale(dataPoints[dataPoints.length - 1].week);
                      const pointY = padding.top + yScale(dataPoints[dataPoints.length - 1].upr);
                      const teamName = getDisplayTeamName(team.userId, team.userInfo.teamName, year);
                      const tooltipWidth = teamName.length * 7 + 16;
                      const tooltipHeight = 30;
                      
                      // Check if tooltip would go beyond right edge of chart
                      const wouldOverflow = pointX + 10 + tooltipWidth > padding.left + innerWidth;
                      
                      // Position tooltip to the left if it would overflow
                      const tooltipX = wouldOverflow ? pointX - 10 - tooltipWidth : pointX + 10;
                      const textX = wouldOverflow ? pointX - 10 - tooltipWidth + 8 : pointX + 18;
                      
                      return (
                        <g>
                          <rect
                            x={tooltipX}
                            y={pointY - 25}
                            width={tooltipWidth}
                            height={tooltipHeight}
                            fill="rgba(0, 0, 0, 0.8)"
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeWidth="1"
                            rx="4"
                            ry="4"
                          />
                          <text
                            x={textX}
                            y={pointY - 8}
                            fill="white"
                            fontSize="12"
                            fontWeight="medium"
                          >
                            {teamName}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Axis labels */}
              <text
                x={padding.left + innerWidth / 2}
                y={chartHeight - 5}
                textAnchor="middle"
                className={`${chartWidth > 600 ? 'text-sm' : 'text-xs'} font-medium fill-gray-700 dark:fill-gray-200`}
                fontSize={chartWidth > 600 ? 14 : 12}
              >
                Week
              </text>
              
              <text
                x={12}
                y={padding.top + innerHeight / 2}
                textAnchor="middle"
                className={`${chartWidth > 600 ? 'text-sm' : 'text-xs'} font-medium fill-gray-700 dark:fill-gray-200`}
                fontSize={chartWidth > 600 ? 14 : 12}
                transform={`rotate(-90, 12, ${padding.top + innerHeight / 2})`}
              >
                {chartWidth > 600 ? 'Union Power Rating' : 'UPR'}
              </text>
            </svg>
          </div>
        </div>

        {/* Current Rankings */}
        <div className="flex-1 lg:flex-[1] lg:min-w-80">
          <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Week {currentWeek} Rankings
          </h4>
          
          <div className="space-y-2">
            {currentWeekData.map((team) => {
              const weekData = team.weeklyData.find(d => d.week === Math.min(currentWeek, team.weeklyData.length));
              
              return (
                <div
                  key={team.userId}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    
                    <div className="hidden sm:block flex-shrink-0">
                      <TeamLogo
                        teamName={team.userInfo.teamName}
                        abbreviation={team.userInfo.abbreviation}
                        size="sm"
                        clickable
                        onClick={() => openTeamProfile(team.userId, team.userInfo.teamName)}
                      />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {getDisplayTeamName(team.userId, team.userInfo.teamName, year)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                        {team.userInfo.abbreviation}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {team.currentUPR.toFixed(1)}
                    </div>
                    {weekData && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {weekData.wins}-{weekData.losses}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Week scrubber */}
      <div className="mt-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Week:
          </label>
          <input
            type="range"
            min="4"
            max={maxWeek}
            value={currentWeek}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentWeek(parseInt(e.target.value));
            }}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-12">
            {currentWeek}/{maxWeek}
          </span>
        </div>
      </div>
    </div>
  );
};