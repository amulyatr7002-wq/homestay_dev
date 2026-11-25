export type StayDateRange = { checkIn: Date; checkOut: Date };

export function hasDateConflict(requested: StayDateRange, existing: StayDateRange[]) {
  return existing.some((range) =>
    range.checkIn.getTime() < requested.checkOut.getTime()
    && range.checkOut.getTime() > requested.checkIn.getTime(),
  );
}

export function calculateCancellationRefund(amountPaise: number, checkIn: Date, now: Date) {
  const fullRefund = checkIn.getTime() - now.getTime() > 7 * 24 * 60 * 60 * 1000;
  const refundPercent = fullRefund ? 100 : 50;
  return {
    refundPercent,
    refundAmountPaise: Math.round(amountPaise * refundPercent / 100),
  };
}
