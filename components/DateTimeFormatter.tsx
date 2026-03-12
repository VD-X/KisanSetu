import React, { useState, useEffect } from 'react';

interface DateTimeExampleProps {
  messageId: string;
  timestamp: string;
}

const DateTimeFormatter: React.FC<DateTimeExampleProps> = ({ messageId, timestamp }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Method 1: Basic toLocaleString()
  const formatBasic = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Method 2: Better toLocaleTimeString()
  const formatTimeOnly = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Method 3: Advanced formatting with options
  const formatAdvanced = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      second: undefined
    });
  };

  // Method 4: Custom formatting
  const formatCustom = (dateString: string) => {
    const date = new Date(dateString);
    const hoursValue = date.getHours();
    const minutesValue = date.getMinutes();
    const ampm = hoursValue >= 12 ? 'PM' : 'AM';
    const displayHours = hoursValue % 12 || 12;
    const displayMinutes = minutesValue.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Method 5: Date formatting
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-IN', options);
  };

  // Method 6: ISO formatting
  const formatISO = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString();
  };

  const sampleTimestamp = timestamp || new Date().toISOString();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🕒 Date & Time Formatting Examples
      </h2>

      <div className="space-y-6">
        {/* Sample Message */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <span className="font-medium text-gray-900">You</span>
            <span className="text-xs text-gray-500">Just now</span>
          </div>
          <div className="text-gray-800">
            This is a sample message to demonstrate date/time formatting.
          </div>
        </div>

        {/* Formatting Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Method 1: Basic toLocaleString() */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Method 1: Basic toLocaleString()</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <code className="bg-white px-2 py-1 rounded">new Date(dateString).toLocaleString()</code>
              </div>
              <div className="font-mono text-blue-800 bg-white p-2 rounded">
                {formatBasic(sampleTimestamp)}
              </div>
            </div>
          </div>

          {/* Method 2: Better toLocaleTimeString() */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Method 2: Better toLocaleTimeString()</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <code className="bg-white px-2 py-1 rounded">new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })</code>
              </div>
              <div className="font-mono text-green-800 bg-white p-2 rounded">
                {formatTimeOnly(sampleTimestamp)}
              </div>
            </div>
          </div>

          {/* Method 3: Advanced with AM/PM */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-3">Method 3: Advanced (Recommended)</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <code className="bg-white px-2 py-1 rounded">new Date(dateString).toLocaleTimeString('en-IN', { hour: "2-digit", minute: "2-digit", hour12: true })</code>
              </div>
              <div className="font-mono text-purple-800 bg-white p-2 rounded">
                {formatAdvanced(sampleTimestamp)}
              </div>
            </div>
          </div>

          {/* Method 4: Custom Formatting */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900 mb-3">Method 4: Custom Formatting</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <code className="bg-white px-2 py-1 rounded">Custom logic with AM/PM</code>
              </div>
              <div className="font-mono text-orange-800 bg-white p-2 rounded">
                {formatCustom(sampleTimestamp)}
              </div>
            </div>
          </div>

          {/* Date Only */}
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-pink-900 mb-3">Date Only Formatting</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <code className="bg-white px-2 py-1 rounded">toLocaleDateString() with options</code>
              </div>
              <div className="font-mono text-pink-800 bg-white p-2 rounded">
                {formatDate(sampleTimestamp)}
              </div>
            </div>
          </div>

          {/* ISO Format */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">ISO Format</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <code className="bg-white px-2 py-1 rounded">date.toISOString()</code>
              </div>
              <div className="font-mono text-gray-800 bg-white p-2 rounded text-xs">
                {formatISO(sampleTimestamp)}
              </div>
            </div>
          </div>
        </div>

        {/* Current Time Display */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-3">⏰ Current Time</h3>
          <div className="text-2xl font-mono text-yellow-800">
            {currentTime.toLocaleTimeString('en-IN', { 
              hour: "2-digit", 
              minute: "2-digit", 
              second: "2-digit",
              hour12: true 
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 p-4 bg-blue-100 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Recommendations</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start">
              <i className="fas fa-check text-green-600 mr-2 mt-1"></i>
              <div>
                <strong>Use Method 2 for time-only:</strong> Perfect for message timestamps
              </div>
            </div>
            <div className="flex items-start">
              <i className="fas fa-check text-green-600 mr-2 mt-1"></i>
              <div>
                <strong>Use Method 3 for full date/time:</strong> Includes AM/PM automatically
              </div>
            </div>
            <div className="flex items-start">
              <i className="fas fa-check text-green-600 mr-2 mt-1"></i>
              <div>
                <strong>Avoid Method 1:</strong> toLocaleString() can be inconsistent across browsers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTimeFormatter;
