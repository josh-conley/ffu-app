import { useMemo, useEffect, useState } from 'react';
import type { LeagueTier } from '../../types';

interface LeagueProgressionChartProps {
  seasonHistory: {
    year: string;
    league: LeagueTier;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
    unionPowerRating?: number;
  }[];
}

const LEAGUE_COLORS: Record<LeagueTier, string> = {
  'PREMIER': '#eab308', // yellow-500 (matches premier-colors)
  'MASTERS': '#a855f7', // purple-500 (matches masters-colors) 
  'NATIONAL': '#dc2626'  // red-600 (matches national-colors)
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

export const LeagueProgressionChart: React.FC<LeagueProgressionChartProps> = ({ seasonHistory }) => {
  const [containerWidth, setContainerWidth] = useState(800);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setContainerWidth(Math.max(width - 100, 400)); // Account for padding
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chartData = useMemo(() => {
    if (!seasonHistory.length) return null;

    // Sort seasons by year (oldest first)
    const sortedSeasons = [...seasonHistory].sort((a, b) => a.year.localeCompare(b.year));
    
    // Get ALL years from 2018 to current year (complete timeline)
    const currentYear = new Date().getFullYear();
    const startYear = 2018;
    const allYears = Array.from({ length: currentYear - startYear + 1 }, (_, i) => String(startYear + i));
    
    // Always show ALL possible league tiers for complete scale
    const allPossibleLeagues = new Set<LeagueTier>(['PREMIER', 'MASTERS', 'NATIONAL']);
    
    // Responsive chart dimensions - always fit container width
    const chartWidth = containerWidth;
    const chartHeight = isMobile ? 140 : 160;
    const padding = isMobile ? 30 : 40;
    const plotWidth = chartWidth - (padding * 2);
    const plotHeight = chartHeight - (padding * 2);
    
    // X-axis: years
    const xScale = (yearIndex: number) => padding + (yearIndex / Math.max(allYears.length - 1, 1)) * plotWidth;
    
    // Y-axis: league tiers - always use standard 1,2,3 positioning
    const availableLeaguesList = Array.from(allPossibleLeagues).sort((a, b) => LEAGUE_ORDER[a] - LEAGUE_ORDER[b]);
    const yScale = (league: LeagueTier) => {
      const leagueIndex = availableLeaguesList.indexOf(league);
      return padding + (leagueIndex / Math.max(availableLeaguesList.length - 1, 1)) * plotHeight;
    };
    
    // Create data points for the line (only for years where member actually played)
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

    return {
      dataPoints,
      allYears,
      availableLeaguesList,
      chartWidth,
      chartHeight,
      padding,
      plotHeight,
      xScale,
      yScale
    };
  }, [seasonHistory, containerWidth, isMobile]);

  if (!chartData) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No season history available
      </div>
    );
  }

  const { dataPoints, allYears, availableLeaguesList, chartWidth, chartHeight, padding, plotHeight, xScale } = chartData;

  // Create path string for the line (handle gaps for years not played)
  const linePath = dataPoints.length > 1 ? dataPoints
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      
      // Check if there's a gap between this point and the previous one
      const prevPoint = dataPoints[index - 1];
      const yearGap = parseInt(point.year) - parseInt(prevPoint.year);
      
      if (yearGap > 1) {
        // There's a gap, so start a new line segment
        return `M ${point.x} ${point.y}`;
      } else {
        // Continuous, draw line
        return `L ${point.x} ${point.y}`;
      }
    })
    .join(' ') : '';

  return (
    <div className="card">
      <h3 className={`font-semibold text-gray-900 dark:text-gray-100 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
        League Tier Progression
      </h3>
      
      {/* Legend - moved above chart */}
      <div className={`flex flex-wrap justify-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
        {availableLeaguesList.map((league) => (
          <div key={`legend-${league}`} className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
            <div
              className={`rounded-full border border-white dark:border-gray-600 ${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
              style={{ backgroundColor: LEAGUE_COLORS[league] }}
            />
            <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {LEAGUE_NAMES[league]}
            </span>
          </div>
        ))}
      </div>
      
      <div>
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
        >
          {/* Background grid lines - horizontal (leagues) - show standard 3-tier positions */}
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
                  {/* Vertical line */}
                  <line
                    x1={lineX}
                    y1={padding}
                    x2={lineX}
                    y2={chartHeight - padding}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                  {/* Label */}
                  <text
                    x={lineX}
                    y={padding - (isMobile ? 8 : 12)}
                    textAnchor="middle"
                    className={`fill-purple-600 dark:fill-purple-400 font-medium ${isMobile ? 'text-sm' : 'text-2xl'}`}
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
              className={`font-medium fill-gray-700 dark:fill-gray-300 ${isMobile ? 'text-base' : 'text-2xl'}`}
            >
              {isMobile ? `'${year.slice(-2)}` : year}
            </text>
          ))}
          
          {/* Main progression line */}
          <path
            d={linePath}
            stroke="#6b7280"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {dataPoints.map((point) => (
            <g key={`point-${point.year}`}>
              {/* Point circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isMobile ? "6" : "7"}
                fill={LEAGUE_COLORS[point.league]}
                stroke="white"
                strokeWidth={isMobile ? "2" : "2.5"}
                className="drop-shadow-sm"
              />
              
              {/* Hover area for tooltip */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isMobile ? "12" : "15"}
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {point.year}: {LEAGUE_NAMES[point.league]} League
                </title>
              </circle>
            </g>
          ))}
          </svg>
      </div>
    </div>
  );
};