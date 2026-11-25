export function calculateBookingPrice(pricePerNight: number, nights: number) {
  return calculateBookingPriceFromSubtotal(pricePerNight * nights, 800);
}

export function calculateBookingPriceFromSubtotal(subtotal: number, cleaningFee = 800) {
  const serviceFee = Math.round(subtotal * 0.08);
  const taxes = Math.round((subtotal + cleaningFee + serviceFee) * 0.05);
  return {
    subtotal,
    cleaningFee,
    serviceFee,
    taxes,
    totalPrice: subtotal + cleaningFee + serviceFee + taxes,
  };
}

export function nightsBetween(checkIn: Date, checkOut: Date) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}
