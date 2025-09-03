import { useMemo, useEffect, useState } from 'react';
import type { LeagueTier, UserInfo } from '../../types';

interface MemberSeasonHistory {
  year: string;
  league: LeagueTier;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  playoffFinish?: number;
  unionPowerRating?: number;
}

interface ComparisonLeagueProgressionChartProps {
  player1: {
    userInfo: UserInfo;
    seasonHistory: MemberSeasonHistory[];
  } | null;
  player2: {
    userInfo: UserInfo;
    seasonHistory: MemberSeasonHistory[];
  } | null;
}

const LEAGUE_COLORS: Record<LeagueTier, string> = {
  'PREMIER': '#eab308', // yellow-500
  'MASTERS': '#a855f7', // purple-500 
  'NATIONAL': '#dc2626'  // red-600
};

const LEAGUE_NAMES: Record<LeagueTier, string> = {
  'PREMIER': 'Premier',
  'MASTERS': 'Masters', 
  'NATIONAL': 'National'
};

const LEAGUE_ORDER: Record<LeagueTier, number> = {
  'PREMIER': 1,
  'MASTERS': 2,
  'NATIONAL': 3
};

// Player line colors
const PLAYER_COLORS = {
  player1: '#3b82f6', // blue-500
  player2: '#22c55e'  // green-500
};

export const ComparisonLeagueProgressionChart: React.FC<ComparisonLeagueProgressionChartProps> = ({ 
  player1, 
  player2 
}) => {
  const [containerWidth, setContainerWidth] = useState(800);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setContainerWidth(Math.max(width - 100, 400));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chartData = useMemo(() => {
    if (!player1 || !player2) return null;

    // Get complete timeline
    const currentYear = new Date().getFullYear();
    const startYear = 2018;
    const allYears = Array.from({ length: currentYear - startYear + 1 }, (_, i) => String(startYear + i));
    
    // All possible league tiers
    const allPossibleLeagues = new Set<LeagueTier>(['PREMIER', 'MASTERS', 'NATIONAL']);

    // Chart dimensions
    const chartWidth = containerWidth;
    const chartHeight = isMobile ? 160 : 180;
    const padding = isMobile ? 40 : 50;
    const plotWidth = chartWidth - (padding * 2);
    const plotHeight = chartHeight - (padding * 2);
    
    const xScale = (yearIndex: number) => padding + (yearIndex / Math.max(allYears.length - 1, 1)) * plotWidth;
    
    const availableLeaguesList = Array.from(allPossibleLeagues).sort((a, b) => LEAGUE_ORDER[a] - LEAGUE_ORDER[b]);
    const yScale = (league: LeagueTier) => {
      const leagueIndex = availableLeaguesList.indexOf(league);
      return padding + (leagueIndex / Math.max(availableLeaguesList.length - 1, 1)) * plotHeight;
    };

    // Create data points for both players
    const player1Data = (() => {
      const sortedSeasons = [...player1.seasonHistory].sort((a, b) => a.year.localeCompare(b.year));
      
      const dataPoints = sortedSeasons.map((season) => {
        const yearIndex = allYears.indexOf(season.year);
        return {
          x: xScale(yearIndex),
          y: yScale(season.league),
          year: season.year,
          league: season.league,
          yearIndex
        };
      });

      // Create path string for the line (handle gaps)
      const linePath = dataPoints.length > 1 ? dataPoints
        .map((point, index) => {
          if (index === 0) return `M ${point.x} ${point.y}`;
          
          const prevPoint = dataPoints[index - 1];
          const yearGap = parseInt(point.year) - parseInt(prevPoint.year);
          
          if (yearGap > 1) {
            return `M ${point.x} ${point.y}`;
          } else {
            return `L ${point.x} ${point.y}`;
          }
        })
        .join(' ') : '';

      return { dataPoints, linePath };
    })();

    const player2Data = (() => {
      const sortedSeasons = [...player2.seasonHistory].sort((a, b) => a.year.localeCompare(b.year));
      
      const dataPoints = sortedSeasons.map((season) => {
        const yearIndex = allYears.indexOf(season.year);
        return {
          x: xScale(yearIndex),
          y: yScale(season.league),
          year: season.year,
          league: season.league,
          yearIndex
        };
      });

      // Create path string for the line (handle gaps)
      const linePath = dataPoints.length > 1 ? dataPoints
        .map((point, index) => {
          if (index === 0) return `M ${point.x} ${point.y}`;
          
          const prevPoint = dataPoints[index - 1];
          const yearGap = parseInt(point.year) - parseInt(prevPoint.year);
          
          if (yearGap > 1) {
            return `M ${point.x} ${point.y}`;
          } else {
            return `L ${point.x} ${point.y}`;
          }
        })
        .join(' ') : '';

      return { dataPoints, linePath };
    })();

    return {
      player1Data,
      player2Data,
      allYears,
      availableLeaguesList,
      chartWidth,
      chartHeight,
      padding,
      plotHeight,
      xScale
    };
  }, [player1, player2, containerWidth, isMobile]);

  if (!chartData) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Select two members to compare their progressions
      </div>
    );
  }

  const { player1Data, player2Data, allYears, availableLeaguesList, chartWidth, chartHeight, padding, plotHeight, xScale } = chartData;

  return (
    <div className="card">
      <h3 className={`font-semibold text-gray-900 dark:text-gray-100 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
        League Tier Progression Comparison
      </h3>
      
      {/* Member legend */}
      <div className={`mb-3 flex flex-wrap justify-center ${isMobile ? 'gap-3' : 'gap-6'}`}>
        <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
          <svg width={isMobile ? "16" : "24"} height="4" className="flex-shrink-0">
            <line
              x1="0"
              y1="2"
              x2={isMobile ? "16" : "24"}
              y2="2"
              stroke={PLAYER_COLORS.player1}
              strokeWidth="3"
            />
          </svg>
          <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
            {player1?.userInfo.abbreviation}
          </span>
        </div>
        <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
          <svg width={isMobile ? "16" : "24"} height="4" className="flex-shrink-0">
            <line
              x1="0"
              y1="2"
              x2={isMobile ? "16" : "24"}
              y2="2"
              stroke={PLAYER_COLORS.player2}
              strokeWidth="3"
              strokeDasharray="8,8"
            />
          </svg>
          <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
            {player2?.userInfo.abbreviation}
          </span>
        </div>
      </div>
      
      <div>
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
        >
          {/* Background grid lines - horizontal (leagues) */}
          {availableLeaguesList.map((league) => {
            const leagueIndex = availableLeaguesList.indexOf(league);
            const y = padding + (leagueIndex / Math.max(availableLeaguesList.length - 1, 1)) * plotHeight;
            return (
              <line
                key={`grid-h-${league}`}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
                className="dark:stroke-gray-600"
              />
            );
          })}

          {/* Y-axis labels (league tiers) */}
          {availableLeaguesList.map((league) => {
            const leagueIndex = availableLeaguesList.indexOf(league);
            const y = padding + (leagueIndex / Math.max(availableLeaguesList.length - 1, 1)) * plotHeight;
            const label = league.charAt(0); // P, M, N
            return (
              <text
                key={`y-label-${league}`}
                x={padding - (isMobile ? 8 : 12)}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}
                fill={LEAGUE_COLORS[league]}
              >
                {label}
              </text>
            );
          })}
          
          {/* Background grid lines - vertical (years) */}
          {allYears.map((year, index) => (
            <line
              key={`grid-v-${year}`}
              x1={xScale(index)}
              y1={padding}
              x2={xScale(index)}
              y2={chartHeight - padding}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,2"
              className="dark:stroke-gray-600"
            />
          ))}
          
          {/* Masters Introduction Line - between 2021 and 2022 */}
          {(() => {
            const year2021Index = allYears.indexOf('2021');
            const year2022Index = allYears.indexOf('2022');
            if (year2021Index !== -1 && year2022Index !== -1) {
              const lineX = (xScale(year2021Index) + xScale(year2022Index)) / 2;
              return (
                <g key="masters-intro">
                  <line
                    x1={lineX}
                    y1={padding}
                    x2={lineX}
                    y2={chartHeight - padding}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={lineX}
                    y={padding - (isMobile ? 4 : 8)}
                    textAnchor="middle"
                    className={`fill-purple-600 dark:fill-purple-400 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}
                  >
                    Masters Introduced
                  </text>
                </g>
              );
            }
            return null;
          })()}
          
          {/* X-axis labels (years) */}
          {allYears.map((year, index) => (
            <text
              key={`x-label-${year}`}
              x={xScale(index)}
              y={chartHeight - (isMobile ? 8 : 12)}
              textAnchor="middle"
              className={`font-medium fill-gray-700 dark:fill-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}
            >
              {isMobile ? `'${year.slice(-2)}` : year}
            </text>
          ))}
          
          {/* Player 1 progression line */}
          {player1Data.linePath && (
            <path
              d={player1Data.linePath}
              stroke={PLAYER_COLORS.player1}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0"
            />
          )}
          
          {/* Player 1 data points */}
          {player1Data.dataPoints.map((point) => (
            <circle
              key={`p1-point-${point.year}`}
              cx={point.x}
              cy={point.y}
              r={isMobile ? "5" : "6"}
              fill={PLAYER_COLORS.player1}
              stroke="white"
              strokeWidth={isMobile ? "2" : "2.5"}
              className="drop-shadow-sm"
            >
              <title>
                {player1?.userInfo.abbreviation} - {point.year}: {LEAGUE_NAMES[point.league]} League
              </title>
            </circle>
          ))}

          {/* Player 2 progression line */}
          {player2Data.linePath && (
            <path
              d={player2Data.linePath}
              stroke={PLAYER_COLORS.player2}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="12,12"
            />
          )}
          
          {/* Player 2 data points */}
          {player2Data.dataPoints.map((point) => (
            <circle
              key={`p2-point-${point.year}`}
              cx={point.x}
              cy={point.y}
              r={isMobile ? "5" : "6"}
              fill={PLAYER_COLORS.player2}
              stroke="white"
              strokeWidth={isMobile ? "2" : "2.5"}
              className="drop-shadow-sm"
            >
              <title>
                {player2?.userInfo.abbreviation} - {point.year}: {LEAGUE_NAMES[point.league]} League
              </title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};