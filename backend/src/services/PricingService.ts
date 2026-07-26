import { Settings } from '../models/Settings';
import { PriceBreakdown } from '../types';

export class PricingService {
  async getPricingConfig() {
    const settings = await Settings.findOne();
    if (!settings) {
      throw new Error('Settings not configured');
    }
    return settings.pricing;
  }

  async calculatePrice(
    distanceKm: number,
    durationMinutes: number,
    surgeMultiplier: number = 1,
    isNight: boolean = false,
    isRush: boolean = false,
    isHoliday: boolean = false,
    isAirport: boolean = false
  ): Promise<PriceBreakdown> {
    const pricing = await this.getPricingConfig();

    const baseFare = pricing.baseFare;
    const distanceFare = Math.round(distanceKm * pricing.pricePerKm);
    const timeFare = Math.round(durationMinutes * pricing.pricePerMinute);

    let effectiveMultiplier = surgeMultiplier;
    let nightSurcharge = 0;
    let rushSurcharge = 0;

    if (isNight) {
      nightSurcharge = Math.round((baseFare + distanceFare + timeFare) * (pricing.nightCoefficient - 1));
    }

    if (isRush) {
      rushSurcharge = Math.round((baseFare + distanceFare + timeFare) * (pricing.rushCoefficient - 1));
    }

    if (isHoliday) {
      effectiveMultiplier *= pricing.holidayCoefficient;
    }

    const airportFee = isAirport ? pricing.airportFee : 0;

    const subtotal = baseFare + distanceFare + timeFare + nightSurcharge + rushSurcharge + airportFee;
    const surgedAmount = Math.round(subtotal * (effectiveMultiplier - 1));
    const total = Math.max(subtotal + surgedAmount, pricing.minimumFare);

    return {
      baseFare,
      distanceFare,
      timeFare,
      surgeMultiplier: effectiveMultiplier,
      nightSurcharge,
      rushSurcharge,
      airportFee,
      total,
    };
  }

  isNightTime(hour: number): boolean {
    return hour >= 22 || hour < 6;
  }

  isRushHour(hour: number): boolean {
    return (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
  }
}
