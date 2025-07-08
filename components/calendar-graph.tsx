"use client"

import React from 'react';
import { format, parseISO, startOfWeek, addDays, isToday } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CalendarGraphItem {
  date: string;
  count: number;
  day?: number;
  month?: number;
  total?: number;
  week?: number;
  year?: number;
}

export interface ColorLevel {
  start: number;
  end: number;
  color: string;
}

export interface WeekLabel {
  label: string;
  col: number;
}

interface CalendarGraphProps {
  calendarGraphList: CalendarGraphItem[];
  boxRender?: (boxDom: React.ReactNode, boxItem: CalendarGraphItem) => React.ReactNode;
  boxPadding?: number;
  boxSize?: number;
  colorLevel?: ColorLevel[];
  weekLabelList?: WeekLabel[];
  getBoxColor?: (item?: CalendarGraphItem, isActive?: boolean) => string;
  selectedDay?: string;
  onSelectedDay?: (day?: string) => void;
  prefixCls?: string;
  className?: string;
}

function getDefaultColor(count: number, colorLevel?: ColorLevel[]) {
  if (!colorLevel) {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count === 1) return 'bg-green-200 dark:bg-green-900';
    if (count === 2) return 'bg-green-300 dark:bg-green-800';
    if (count === 3) return 'bg-green-400 dark:bg-green-700';
    return 'bg-green-500 dark:bg-green-600';
  }
  for (const level of colorLevel) {
    if (count >= level.start && count <= level.end) return level.color;
  }
  return 'bg-gray-100 dark:bg-gray-800';
}

export const CalendarGraph: React.FC<CalendarGraphProps> = ({
  calendarGraphList,
  boxRender,
  boxPadding = 2,
  boxSize = 14,
  colorLevel,
  weekLabelList = [
    { label: 'Sun', col: 1 },
    { label: 'Tue', col: 3 },
    { label: 'Thu', col: 5 },
    { label: 'Sat', col: 7 },
  ],
  getBoxColor,
  selectedDay,
  onSelectedDay,
  prefixCls = '',
  className = '',
}) => {
  // Build a map for quick lookup
  const dataMap = new Map(calendarGraphList.map(item => [item.date, item]));

  // Find the min and max date
  const dates = calendarGraphList.map(item => parseISO(item.date));
  const minDate = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : new Date();
  const maxDate = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : new Date();

  // Always show at least 12 weeks
  const minWeeks = 12;
  const startDate = startOfWeek(minDate, { weekStartsOn: 0 });
  const today = new Date();
  const endDate = maxDate > today ? maxDate : today;
  const totalDays = Math.max(
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    minWeeks * 7
  );
  const numWeeks = Math.ceil(totalDays / 7);

  // Build the grid: columns = weeks, rows = days (Sun-Sat)
  const grid: (CalendarGraphItem | null)[][] = Array.from({ length: numWeeks }, (_, weekIdx) =>
    Array.from({ length: 7 }, (_, dayIdx) => {
      const date = addDays(startDate, weekIdx * 7 + dayIdx);
      const dateStr = format(date, 'yyyy-MM-dd');
      return dataMap.get(dateStr) || { date: dateStr, count: 0 };
    })
  );

  // Month labels: Only show label above the first week where the month changes
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = '';
  for (let w = 0; w < numWeeks; w++) {
    const firstDay = grid[w][0];
    if (firstDay) {
      const month = format(parseISO(firstDay.date), 'MMM');
      if (month !== lastMonth) {
        monthLabels.push({ label: month, col: w });
        lastMonth = month;
      }
    }
  }

  // Helper for static Tailwind color classes
  function colorClass(count: number) {
    if (count === 0) return 'bg-gray-200';
    if (count === 1) return 'bg-green-300';
    if (count === 2) return 'bg-green-400';
    return 'bg-green-600';
  }

  return (
    <TooltipProvider>
      <div className={`flex flex-col gap-1 ${className}`.trim()}>
        {/* Month labels */}
        <div className="flex gap-1 mb-2 ml-8 relative">
          {Array.from({ length: numWeeks }).map((_, i) => {
            const found = monthLabels.find(m => m.col === i);
            return (
              <div key={i} className="text-xs text-muted-foreground w-5 text-center">
                {found ? found.label : ''}
              </div>
            );
          })}
        </div>
        {/* Calendar grid */}
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="text-xs text-muted-foreground h-5 flex items-center justify-center">
                {weekLabelList.find(l => l.col - 1 === i)?.label || ''}
              </div>
            ))}
          </div>
          {/* Calendar squares */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {grid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((item, dayIdx) => {
                  if (!item) {
                    // Render empty box for null
                    return (
                      <div
                        key={dayIdx}
                        className="rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-200"
                        style={{ width: boxSize, height: boxSize, margin: boxPadding / 2 }}
                      />
                    );
                  }
                  const isActive = selectedDay === item.date;
                  const color = getBoxColor
                    ? getBoxColor(item, isActive)
                    : colorClass(item.count || 0);
                  const boxDom = (
                    <div
                      className={`rounded-sm border border-gray-200 dark:border-gray-700 ${color} ${isToday(parseISO(item.date)) ? 'ring-2 ring-blue-500 ring-offset-1' : ''} transition-colors duration-200 cursor-pointer`}
                      style={{ width: boxSize, height: boxSize, margin: boxPadding / 2 }}
                      onClick={() => onSelectedDay?.(item.date)}
                    >
                      {item.count > 0 && (
                        <span className="flex items-center justify-center w-full h-full text-xs font-bold text-white">
                          {item.count}
                        </span>
                      )}
                    </div>
                  );
                  return (
                    <Tooltip key={dayIdx}>
                      <TooltipTrigger asChild>
                        {boxRender ? boxRender(boxDom, item) : boxDom}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.date}</p>
                        <p>{item.count || 0} completed</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}; 