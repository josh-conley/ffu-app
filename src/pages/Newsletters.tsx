import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Star } from 'lucide-react';

interface Newsletter {
  season: number;
  week: number;
  title: string;
  date: string;
  pdf: string;
  featured?: boolean;
  summary?: string;
}

export const Newsletters = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNewsletters = async () => {
      try {
        // Fetch all newsletter metadata files
        const response = await fetch('/newsletters/index.json');
        if (response.ok) {
          const data = await response.json();
          setNewsletters(data);
        } else {
          // If index doesn't exist yet, show empty state
          setNewsletters([]);
        }
      } catch (err) {
        console.error('Error loading newsletters:', err);
        setError('Unable to load newsletters at this time.');
      } finally {
        setLoading(false);
      }
    };

    loadNewsletters();
  }, []);

  const seasons = Array.from(new Set(newsletters.map(n => n.season))).sort((a, b) => b - a);
  const filteredNewsletters = selectedSeason === 'all'
    ? newsletters
    : newsletters.filter(n => n.season === selectedSeason);

  const sortedNewsletters = [...filteredNewsletters].sort((a, b) => {
    if (a.season !== b.season) return b.season - a.season;
    return b.week - a.week;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Weekly Newsletters</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Catch up on league news, highlights, and Commissioner commentary
        </p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Season Filter */}
      {seasons.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Filter by Season:</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All Seasons</option>
            {seasons.map(season => (
              <option key={season} value={season}>
                {season} Season
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty State */}
      {sortedNewsletters.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Newsletters Yet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Check back soon for weekly league updates!
          </p>
        </div>
      )}

      {/* Newsletter Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedNewsletters.map((newsletter, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-6 hover:shadow-lg transition-shadow ${
              newsletter.featured
                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                : 'dark:border-gray-700'
            }`}
          >
            {newsletter.featured && (
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 mb-2">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold">Featured</span>
              </div>
            )}

            <div className="flex items-start gap-3 mb-3">
              <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">{newsletter.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {newsletter.season} Season · Week {newsletter.week}
                </p>
              </div>
            </div>

            {newsletter.summary && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {newsletter.summary}
              </p>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                {new Date(newsletter.date).toLocaleDateString()}
              </div>

              <a
                href={newsletter.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                View PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
