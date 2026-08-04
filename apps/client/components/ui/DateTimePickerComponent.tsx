'use client';

// This file was entirely `//@ts-nocheck`: useState(null), an untyped
// `handleDateSelect(date)`, `Datehandler: (date: any) => void`, and two icon
// components taking bare `props`. It is typed now, and lucide-react supplies the
// icons rather than two hand-rolled inline SVGs.
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock } from 'lucide-react';

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateTimePickerComponentProps {
  /** Called only once the user has actually chosen something. */
  Datehandler: (date: Date) => void;
  value?: Date;
  /** Dates before this are not selectable. */
  minDate?: Date;
  id?: string;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const withTime = (base: Date, hour: number, minute: number): Date => {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return next;
};

export default function DateTimePickerComponent({
  Datehandler,
  value,
  minDate,
  id,
}: DateTimePickerComponentProps) {
  const [selected, setSelected] = useState<Date | undefined>(value);

  /*
   * There was a `useEffect(() => Datehandler(selectedDateTime), [selectedDateTime])`
   * with the state initialised to `new Date()`. Both pickers in the create form
   * therefore fired on mount and set start = end = now, which fails
   * Auctionschema's `date > new Date()` *and* its `endDate > startDate` refinement
   * before the user has touched anything -- so the form arrived pre-invalid.
   *
   * The parent is notified from the change handlers only.
   */
  const commit = (next: Date) => {
    setSelected(next);
    Datehandler(next);
  };

  const onDateSelect = (date: Date | undefined) => {
    if (!date) return;
    // Carry the already-chosen time across a date change.
    const base = selected ?? new Date();
    commit(withTime(date, base.getHours(), base.getMinutes()));
  };

  const onHourChange = (raw: string) => {
    const base = selected ?? new Date();
    commit(withTime(base, Number(raw), base.getMinutes()));
  };

  const onMinuteChange = (raw: string) => {
    const base = selected ?? new Date();
    commit(withTime(base, base.getHours(), Number(raw)));
  };

  return (
    <div className='flex flex-wrap items-center gap-2' id={id}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            className={cn(
              'flex items-center gap-2',
              !selected && 'text-muted-foreground'
            )}
          >
            <CalendarDays className='h-4 w-4' />
            {selected ? format(selected, 'MMM d, yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0'>
          <Calendar
            mode='single'
            selected={selected}
            onSelect={onDateSelect}
            disabled={minDate ? { before: minDate } : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            className={cn(
              'tabular flex items-center gap-2',
              !selected && 'text-muted-foreground'
            )}
          >
            <Clock className='h-4 w-4' />
            {selected ? format(selected, 'h:mm a') : 'Pick a time'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-3'>
          <div className='flex items-center gap-2'>
            <Select
              value={selected ? String(selected.getHours()) : undefined}
              onValueChange={onHourChange}
            >
              <SelectTrigger className='w-[88px]'>
                <SelectValue placeholder='Hour' />
              </SelectTrigger>
              <SelectContent className='max-h-64'>
                {/*
                  Was `[...Array(24)].map((_, i) => value={String(i + 1)}` -- so the
                  options ran 1 to 24 and picking "24" called setHours(24), which
                  rolls over to 00:00 the following day. Hours are 0-23, displayed
                  in 12-hour form to match the `h:mm a` label on the trigger.
                */}
                {HOURS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {format(new Date(2000, 0, 1, hour), 'h a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-muted-foreground'>:</span>
            <Select
              value={selected ? String(selected.getMinutes()) : undefined}
              onValueChange={onMinuteChange}
            >
              <SelectTrigger className='w-[76px]'>
                <SelectValue placeholder='Min' />
              </SelectTrigger>
              <SelectContent className='max-h-64'>
                {MINUTES.map((minute) => (
                  <SelectItem key={minute} value={String(minute)}>
                    {String(minute).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
