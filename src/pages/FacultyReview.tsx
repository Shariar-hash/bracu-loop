import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Header } from '../components/Header';
import { Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Faculty {
  initial: string;
  full_name: string;
  email: string;
  desk: string;
  avg_rating?: number;
}

interface Course {
  course_code: string;
  course_name: string;
}

const getRatingLabel = (rating?: number) => {
  if (rating === undefined || rating === null) return 'No rating yet';
  if (rating < 2) return 'Drop & Run';
  if (rating < 4) return 'Average';
  if (rating < 4.5) return 'Good';
  return 'GOAT';
};

const FacultyReview: React.FC = () => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyCourses, setFacultyCourses] = useState<{faculty_initial: string, course_code: string}[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'faculty' | 'course'>('faculty');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFaculties = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetch faculties
        const { data: facultyData, error: facultyError } = await supabase
          .from('faculties')
          .select('initial, full_name, email, desk');
        
        if (facultyError) {
          setError('Failed to fetch faculty list.');
          setLoading(false);
          return;
        }

        // Fetch average ratings from reviews table
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('faculty_initial, rating');

        // Calculate average ratings (excluding replies which have rating=0)
        const ratingMap: { [key: string]: number } = {};
        if (reviewData) {
          const groupedRatings: { [key: string]: number[] } = {};
          reviewData.forEach(review => {
            // Only include ratings > 0 (main reviews, not replies)
            if (review.rating > 0) {
              if (!groupedRatings[review.faculty_initial]) {
                groupedRatings[review.faculty_initial] = [];
              }
              groupedRatings[review.faculty_initial].push(review.rating);
            }
          });

          Object.keys(groupedRatings).forEach(facultyInitial => {
            const ratings = groupedRatings[facultyInitial];
            const avg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            ratingMap[facultyInitial] = avg;
          });
        }

        // Combine faculty data with ratings
        const facultiesWithRatings = (facultyData || []).map(faculty => ({
          ...faculty,
          avg_rating: ratingMap[faculty.initial] || undefined,
        }));

        setFaculties(facultiesWithRatings);

        // Fetch all courses for search filtering
        const { data: courseData } = await supabase
          .from('courses')
          .select('course_code, course_name');
        setCourses(courseData || []);

        // Fetch faculty-course relationships for course filtering
        const { data: fcData } = await supabase
          .from('faculty_courses')
          .select('faculty_initial, course_code');
        setFacultyCourses(fcData || []);
      } catch (err) {
        setError('Failed to fetch faculty list.');
      }
      
      setLoading(false);
    };
    fetchFaculties();
  }, []);

  // Filter faculties by initial or course code
  const filteredFaculties = faculties.filter(faculty => {
    const searchLower = search.toLowerCase();
    
    if (filterType === 'faculty') {
      return (
        faculty.initial.toLowerCase().includes(searchLower) ||
        faculty.full_name.toLowerCase().includes(searchLower)
      );
    } else {
      // Filter by course code - find faculties that teach courses matching the search
      if (!search.trim()) return true;
      
      const facultyInitials = facultyCourses
        .filter(fc => fc.course_code.toLowerCase().includes(searchLower))
        .map(fc => fc.faculty_initial);
      
      return facultyInitials.includes(faculty.initial);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Faculty Reviews</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Discover what students think about their professors</p>
      
      <div className="search-bar flex gap-2 mb-6">
        <div className="relative flex items-center flex-1 max-w-md">
          <input
            type="text"
            placeholder={filterType === 'faculty' ? "Search by faculty initial or name..." : "Search by course code..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input input-bordered w-full pr-12"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="absolute right-1 h-8 w-8 p-0 btn btn-ghost btn-sm">
                <Filter className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType('faculty')}>
                {filterType === 'faculty' && '✓ '}Search by Faculty
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('course')}>
                {filterType === 'course' && '✓ '}Search by Course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="faculty-list mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="text-slate-500 dark:text-slate-400">Loading faculty...</div>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-12">
            <div className="text-red-500 dark:text-red-400">{error}</div>
          </div>
        ) : filteredFaculties.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-slate-500 dark:text-slate-400">No faculty found matching your search.</div>
          </div>
        ) : (
          filteredFaculties.map(faculty => (
            <div
              key={faculty.initial}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group"
              onClick={() => navigate(`/faculty/${faculty.initial}`)}
            >
              {/* Faculty Avatar */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {faculty.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {faculty.full_name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm truncate">{faculty.email}</p>
                </div>
              </div>
              
              {/* Faculty Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                  <span>🏢</span>
                  <span>Desk {faculty.desk}</span>
                </div>
              </div>
              
              {/* Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {faculty.avg_rating ? faculty.avg_rating.toFixed(1) : 'N/A'}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  !faculty.avg_rating 
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    : faculty.avg_rating < 2 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                    : faculty.avg_rating < 4 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : faculty.avg_rating < 4.5 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                  {getRatingLabel(faculty.avg_rating)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
};

export default FacultyReview;
