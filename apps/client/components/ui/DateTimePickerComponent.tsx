'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

/**
 * A controlled date and time picker.
 *
 * The previous version was under @ts-nocheck with untyped props, held its own
 * copy of the value, and fired its change handler on mount with `new Date()` --
 * which the schema then rejected as "must be in the future". Its hour list also
 * ran 1 to 24, so picking 24 rolled over into the next day.
 */
const DateTimePickerComponent = ({
  value,
  onChange,
  id,
}: {
  value: Date | undefined;
  onChange: (date: Date) => void;
  id?: string;
}) => {
  const withDate = (date: Date) => {
    const next = new Date(value ?? date);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    if (!value) next.setHours(date.getHours(), 0, 0, 0);
    return next;
  };

  const withTime = (hours: number, minutes: number) => {
    const next = new Date(value ?? new Date());
    next.setHours(hours, minutes, 0, 0);
    return next;
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type='button'
            variant='outline'
            className={cn('gap-2 font-normal', !value && 'text-muted-foreground')}
          >
            <CalendarDays className='size-4' />
            {value ? format(value, 'd MMM yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            selected={value}
            onSelect={(date) => date && onChange(withDate(date))}
            disabled={{ before: new Date() }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Select
        value={value ? String(value.getHours()) : undefined}
        onValueChange={(hours) =>
          onChange(withTime(Number(hours), value?.getMinutes() ?? 0))
        }
      >
        <SelectTrigger className='w-[5.5rem] font-mono tabular' aria-label='Hour'>
          <SelectValue placeholder='Hour' />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hour) => (
            <SelectItem key={hour} value={String(hour)} className='font-mono'>
              {String(hour).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value ? String(value.getMinutes()) : undefined}
        onValueChange={(minutes) =>
          onChange(withTime(value?.getHours() ?? 0, Number(minutes)))
        }
      >
        <SelectTrigger className='w-[5.5rem] font-mono tabular' aria-label='Minute'>
          <SelectValue placeholder='Min' />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((minute) => (
            <SelectItem key={minute} value={String(minute)} className='font-mono'>
              {String(minute).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DateTimePickerComponent;
