import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  Wifi,
  Monitor,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface RoomSchedule {
  room: string;
  day: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  occupied: boolean;
  course?: string;
}

interface AvailableSlot {
  room: string;
  day: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  duration: string;
  isCurrentlyAvailable?: boolean;
}

const RoomFinder = () => {
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [availableRooms, setAvailableRooms] = useState<AvailableSlot[]>([]);
  const [allRooms, setAllRooms] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Room schedule data - listing AVAILABLE/EMPTY rooms (occupied: false)
  const roomScheduleData: RoomSchedule[] = [
    // Sunday - 8:00 AM (3 empty rooms)
    { room: '09F-24L', day: 'Sunday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10G-33L', day: 'Sunday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12B-18L', day: 'Sunday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },

    // Monday - 8:00 AM (3 empty rooms)
    { room: '09F-26L', day: 'Monday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '09F-27L', day: 'Monday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10G-33L', day: 'Monday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12B-18L', day: 'Monday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },

    // Tuesday - 8:00 AM (3 empty rooms)
    { room: '09E-21L', day: 'Tuesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '09F-24L', day: 'Tuesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10G-32L', day: 'Tuesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10G-33L', day: 'Tuesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12B-18L', day: 'Tuesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },

    // Wednesday - 8:00 AM (3 empty rooms)
    { room: '09B-08L', day: 'Wednesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '09E-11L', day: 'Wednesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10E-27L', day: 'Wednesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12B-18L', day: 'Wednesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12F-32L', day: 'Wednesday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },

    // Thursday - 8:00 AM (5 empty rooms)
    { room: '09B-10L', day: 'Thursday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '09E-21L', day: 'Thursday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10G-32L', day: 'Thursday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '10G-33L', day: 'Thursday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12F-32L', day: 'Thursday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },

    // Friday - 8:00 AM (no available rooms)

    // Saturday - 8:00 AM (2 empty rooms)
    { room: '10G-33L', day: 'Saturday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    { room: '12B-18L', day: 'Saturday', timeSlot: '08:00 AM', startTime: '08:00', endTime: '11:00', occupied: false },
    
    // Sunday - 11:00 AM (3 empty rooms)
    { room: '09F-24L', day: 'Sunday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },
    { room: '10G-33L', day: 'Sunday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },
    { room: '12B-18L', day: 'Sunday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },

    // Monday - 11:00 AM (3 empty rooms)
    
    { room: '12B-18L', day: 'Monday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },

    // Tuesday - 11:00 AM (2 empty rooms)
    { room: '10G-32L', day: 'Tuesday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },
    { room: '12B-18L', day: 'Tuesday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },

    // Wednesday - 11:00 AM (1 empty room)
    { room: '12B-18L', day: 'Wednesday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },

    // Thursday - 11:00 AM (1 empty room)
    { room: '12B-18L', day: 'Thursday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },
    { room: '12F-31L', day: 'Thursday', timeSlot: '11:00 AM', startTime: '11:00', endTime: '14:00', occupied: false },



    // Friday - 11:00 AM (no available rooms)

    // Sunday - 02:00 PM (3 empty rooms)
    { room: '09F-24L', day: 'Sunday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '10G-34L', day: 'Sunday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12B-18L', day: 'Sunday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },

    // Monday - 02:00 PM (3 empty rooms)
    { room: '10G-33L', day: 'Monday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12B-18L', day: 'Monday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12D-27L', day: 'Monday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12F-31L', day: 'Monday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },

    // Tuesday - 02:00 PM (4 empty rooms)
    { room: '12B-18L', day: 'Tuesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12D-18L', day: 'Tuesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12F-18L', day: 'Tuesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12F-32L', day: 'Tuesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    
    // Wednesday - 02:00 PM (4 empty rooms)
    { room: '09B-10L', day: 'Wednesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '09E-11L', day: 'Wednesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '10E-27L', day: 'Wednesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12B-18L', day: 'Wednesday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },

    // Thursday - 02:00 PM (6 empty rooms)
    { room: '09B-08L', day: 'Thursday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '09E-25L', day: 'Thursday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '10G-33L', day: 'Thursday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12B-18L', day: 'Thursday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12D-27L', day: 'Thursday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12F-31L', day: 'Thursday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },

    // Friday - 02:00 PM (no available rooms)

    // Saturday - 02:00 PM (3 empty rooms)
    { room: '09F-24L', day: 'Saturday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12F-30L', day: 'Saturday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
    { room: '12F-32L', day: 'Saturday', timeSlot: '02:00 PM', startTime: '14:00', endTime: '17:00', occupied: false },
  ];

  const allPossibleRooms = [
    '09B-08L', '09B-10L', '09B-11L', '09E-21L', '09E-24L', '09F-24L', 
    '09F-25L', '09F-26L', '09F-27L', '10E-27L', '10G-32L', '10G-33L', 
    '10G-34L', '12B-18L', '12D-27L', '12F-30L', '12F-31L', '12F-32L'
  ];

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = ['08:00 AM', '11:00 AM', '02:00 PM'];

  // Get current day and time for highlighting
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getCurrentTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 11) return '08:00 AM';
    if (hour >= 11 && hour < 14) return '11:00 AM';
    if (hour >= 14 && hour < 17) return '02:00 PM';
    return null;
  };

  const findAvailableRooms = (day: string, timeSlot: string) => {
    const availableRooms = roomScheduleData
      .filter(schedule => schedule.day === day && schedule.timeSlot === timeSlot && !schedule.occupied)
      .map(schedule => ({
        room: schedule.room,
        day,
        timeSlot,
        startTime: timeSlot === '08:00 AM' ? '08:00' : timeSlot === '11:00 AM' ? '11:00' : '14:00',
        endTime: timeSlot === '08:00 AM' ? '11:00' : timeSlot === '11:00 AM' ? '14:00' : '17:00',
        duration: '3 hours',
        isCurrentlyAvailable: day === getCurrentDay() && timeSlot === getCurrentTimeSlot()
      }));

    return availableRooms;
  };

  const loadTodayRooms = () => {
    const today = getCurrentDay();
    const allTodayRooms: AvailableSlot[] = [];
    
    timeSlots.forEach(slot => {
      const availableForSlot = findAvailableRooms(today, slot);
      allTodayRooms.push(...availableForSlot);
    });

    setAllRooms(allTodayRooms);
    setSelectedDay(today);
  };

  const handleSearch = () => {
    if (!selectedDay || !selectedTimeSlot) {
      toast.error('Please select both day and time slot');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const available = findAvailableRooms(selectedDay, selectedTimeSlot);
      setAvailableRooms(available);
      setLoading(false);
      
      if (available.length === 0) {
        toast.info('No rooms available for the selected time slot');
      } else {
        toast.success(`Found ${available.length} available rooms`);
      }
    }, 500);
  };

  useEffect(() => {
    loadTodayRooms();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: string) => {
    const hour = parseInt(time);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Room Finder
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Find available lab rooms for your study sessions
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Current: {currentTime.toLocaleString()}</span>
              </div>
              <div className="text-xs mt-1">
                Today: {getCurrentDay()} | Current Slot: {getCurrentTimeSlot() || 'Outside operating hours'}
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Available Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="day-select">Day</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger id="day-select">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day} {day === getCurrentDay() && '(Today)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time-select">Time Slot</Label>
                <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                  <SelectTrigger id="time-select">
                    <SelectValue placeholder="Select Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot} - {slot === '08:00 AM' ? '11:00 AM' : slot === '11:00 AM' ? '02:00 PM' : '05:00 PM'}
                        {slot === getCurrentTimeSlot() && ' (Current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleSearch} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Searching...
                    </div>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Find Rooms
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Available Rooms */}
        {allRooms.length > 0 && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Today's Available Rooms ({getCurrentDay()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {timeSlots.map(slot => {
                  const roomsForSlot = allRooms.filter(room => room.timeSlot === slot);
                  const isCurrentSlot = slot === getCurrentTimeSlot();
                  
                  return (
                    <div key={slot} className={`p-4 rounded-lg border ${isCurrentSlot ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Clock className={`h-4 w-4 ${isCurrentSlot ? 'text-green-600' : 'text-gray-600'}`} />
                          {slot} - {slot === '08:00 AM' ? '11:00 AM' : slot === '11:00 AM' ? '02:00 PM' : '05:00 PM'}
                          {isCurrentSlot && <Badge variant="secondary" className="bg-green-100 text-green-800">Current</Badge>}
                        </h4>
                        <Badge variant="outline">{roomsForSlot.length} rooms available</Badge>
                      </div>
                      
                      {roomsForSlot.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {roomsForSlot.map((room, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className={`justify-center p-2 ${isCurrentSlot ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {room.room}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-gray-500">
                          <XCircle className="h-5 w-5 mx-auto mb-1" />
                          <span className="text-sm">No rooms available</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {availableRooms.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Available Rooms - {selectedDay}, {selectedTimeSlot}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRooms.map((room, index) => (
                  <Card key={index} className={`border-2 transition-all duration-200 hover:shadow-md ${room.isCurrentlyAvailable ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-lg">{room.room}</h3>
                        </div>
                        {room.isCurrentlyAvailable && (
                          <Badge className="bg-green-100 text-green-800">Available Now</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{room.day}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{formatTime(room.startTime)} - {formatTime(room.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{room.duration}</span>
                        </div>
                      </div>


                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results Message */}
        {selectedDay && selectedTimeSlot && !loading && availableRooms.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Available Rooms</h3>
              <p className="text-gray-600 mb-4">
                All rooms are occupied during {selectedTimeSlot} on {selectedDay}.
              </p>
              <p className="text-sm text-gray-500">
                Try selecting a different time slot or day.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Usage Instructions */}
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              How to Use Room Finder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Quick Access</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    Today's availability shown automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    Current time slot highlighted in green
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    Real-time availability status
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Time Slots</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    Morning: 8:00 AM - 11:00 AM
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    Afternoon: 11:00 AM - 2:00 PM  
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    Evening: 2:00 PM - 5:00 PM
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default RoomFinder;
