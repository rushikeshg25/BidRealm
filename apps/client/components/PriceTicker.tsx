'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format';

/**
 * The current price, in fixed-width figures so the digits do not shuffle as
 * they change, with a single flash when a new bid moves it. Exact, never
 * abbreviated: this is the number someone is about to have to beat.
 */
const PriceTicker = ({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) => {
  const [flashKey, setFlashKey] = useState(0);
  const previous = useRef(amount);

  useEffect(() => {
    if (previous.current === amount) return;
    previous.current = amount;
    setFlashKey((key) => key + 1);
  }, [amount]);

  return (
    <span
      // Remounting on change restarts the animation; re-adding a class would
      // not, because the browser sees no transition.
      key={flashKey}
      className={cn(
        'inline-block rounded font-mono font-semibold tabular',
        flashKey > 0 && 'animate-price-flash',
        className
      )}
    >
      {formatMoney(amount)}
    </span>
  );
};

export default PriceTicker;
