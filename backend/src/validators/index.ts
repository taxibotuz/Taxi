import { z } from 'zod';

const mongoId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ID');
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const authSchemas = {
  telegram: z.object({
    body: z.object({
      id: z.number({ required_error: 'Telegram ID is required' }),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      photo_url: z.string().optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  profileUpdate: z.object({
    body: z.object({
      phone: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
      language: z.enum(['uz', 'ru', 'en']).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  becomeDriver: z.object({
    body: z.object({
      brand: z.string({ required_error: 'Car brand is required' }).min(1),
      model: z.string({ required_error: 'Car model is required' }).min(1),
      year: z.number({ required_error: 'Car year is required' }).int().min(1900).max(2030),
      color: z.string({ required_error: 'Car color is required' }).min(1),
      plateNumber: z.string({ required_error: 'Plate number is required' }).min(1),
      seats: z.number().int().min(1).max(20).default(4).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
};

export const rideSchemas = {
  create: z.object({
    body: z.object({
      pickupLat: z.number({ required_error: 'Pickup latitude is required' }).min(-90).max(90),
      pickupLng: z.number({ required_error: 'Pickup longitude is required' }).min(-180).max(180),
      pickupAddress: z.string().optional(),
      destLat: z.number({ required_error: 'Destination latitude is required' }).min(-90).max(90),
      destLng: z.number({ required_error: 'Destination longitude is required' }).min(-180).max(180),
      destAddress: z.string().optional(),
      distance: z.number({ required_error: 'Distance is required' }).min(0),
      duration: z.number({ required_error: 'Duration is required' }).min(0),
      paymentMethod: z.enum(['cash']).optional(),
      comment: z.string().max(500).optional(),
      offeredPrice: z.number().min(0).optional(),
      promoCode: z.string().optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  estimate: z.object({
    body: z.object({}).optional(),
    query: z.object({
      distance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Distance must be a non-negative number'),
      duration: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Duration must be a non-negative number'),
    }),
    params: z.object({}).optional(),
  }),
  list: z.object({
    body: z.object({}).optional(),
    query: z.object({
      status: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }).optional(),
    params: z.object({}).optional(),
  }),
  id: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      id: mongoId,
    }),
  }),
  cancel: z.object({
    body: z.object({
      reason: z.string().max(500).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({
      id: mongoId,
    }),
  }),
  updateStatus: z.object({
    body: z.object({
      status: z.enum(['pending', 'searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'disputed']),
    }),
    query: z.object({}).optional(),
    params: z.object({
      id: mongoId,
    }),
  }),
};

export const driverSchemas = {
  location: z.object({
    body: z.object({
      lat: z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
      lng: z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  history: z.object({
    body: z.object({}).optional(),
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }).optional(),
    params: z.object({}).optional(),
  }),
};

export const walletSchemas = {
  topUp: z.object({
    body: z.object({
      amount: z.number({ required_error: 'Amount is required' }).min(1000),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  transactions: z.object({
    body: z.object({}).optional(),
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }).optional(),
    params: z.object({}).optional(),
  }),
};

export const reviewSchemas = {
  create: z.object({
    body: z.object({
      orderId: mongoId,
      rating: z.number({ required_error: 'Rating is required' }).int().min(1).max(5),
      comment: z.string().max(500).optional(),
      type: z.enum(['customer_to_driver', 'driver_to_customer']),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  getByUser: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      userId: mongoId,
    }),
  }),
};

export const promocodeSchemas = {
  create: z.object({
    body: z.object({
      code: z.string({ required_error: 'Code is required' }).min(1).max(50),
      discountType: z.enum(['percentage', 'fixed']),
      discountValue: z.number({ required_error: 'Discount value is required' }).min(0),
      description: z.string().max(500).optional(),
      maxDiscount: z.number().min(0).optional(),
      minOrderAmount: z.number().min(0).default(0).optional(),
      usageLimit: z.number().int().min(1).default(100).optional(),
      perUserLimit: z.number().int().min(1).default(1).optional(),
      isActive: z.boolean().default(true).optional(),
      startsAt: z.string({ required_error: 'Start date is required' }),
      expiresAt: z.string({ required_error: 'Expiry date is required' }),
      applicableTo: z.array(z.enum(['ride', 'delivery'])).default(['ride']).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  validate: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      code: z.string().min(1),
    }),
  }),
};

export const notificationSchemas = {
  readOne: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      notificationId: mongoId,
    }),
  }),
  deleteOne: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      notificationId: mongoId,
    }),
  }),
};

const settingsBodySchema = z.object({
  pricing: z.object({
    baseFare: z.number().min(0).optional(),
    pricePerKm: z.number().min(0).optional(),
    pricePerMinute: z.number().min(0).optional(),
    minimumFare: z.number().min(0).optional(),
    nightCoefficient: z.number().min(1).optional(),
    nightStartHour: z.number().min(0).max(23).optional(),
    nightEndHour: z.number().min(0).max(23).optional(),
    rushCoefficient: z.number().min(1).optional(),
    holidayCoefficient: z.number().min(1).optional(),
    airportFee: z.number().min(0).optional(),
    surgeEnabled: z.boolean().optional(),
  }).optional(),
  search: z.object({
    maxRadius: z.number().min(0).optional(),
    searchTimeout: z.number().min(0).optional(),
    maxDriversPerSearch: z.number().int().min(1).optional(),
    expansionStep: z.number().min(0).optional(),
    maxExpansions: z.number().int().min(0).optional(),
  }).optional(),
  driver: z.object({
    commission: z.number().min(0).max(100).optional(),
    minRating: z.number().min(0).max(5).optional(),
    maxRidesBeforeBreak: z.number().int().min(0).optional(),
  }).optional(),
  district: z.object({
    enabled: z.boolean().optional(),
    name: z.string().optional(),
    centerLat: z.number().optional(),
    centerLng: z.number().optional(),
    boundary: z.array(z.object({
      lat: z.number(),
      lng: z.number(),
    })).optional(),
  }).optional(),
  features: z.object({
    foodDelivery: z.boolean().optional(),
    rideScheduling: z.boolean().optional(),
    referralSystem: z.boolean().optional(),
    sosButton: z.boolean().optional(),
  }).optional(),
  payment: z.object({
    enabledMethods: z.array(z.string()).optional(),
    walletEnabled: z.boolean().optional(),
    cashEnabled: z.boolean().optional(),
  }).optional(),
  maintenance: z.object({
    isEnabled: z.boolean().optional(),
    message: z.string().optional(),
  }).optional(),
  notifications: z.object({
    pushEnabled: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
  }).optional(),
  general: z.object({
    appName: z.string().optional(),
    contactPhone: z.string().optional(),
    supportUrl: z.string().optional(),
    termsUrl: z.string().optional(),
    privacyUrl: z.string().optional(),
    defaultLanguage: z.string().optional(),
    availableLanguages: z.array(z.string()).optional(),
  }).optional(),
  matching: z.object({
    mode: z.enum(['nearby', 'all']).optional(),
  }).optional(),
});

export const adminSchemas = {
  updateSettings: z.object({
    body: settingsBodySchema,
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  assignAdmin: z.object({
    body: z.object({
      telegramId: z.number({ required_error: 'Telegram ID is required' }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  banUser: z.object({
    body: z.object({
      reason: z.string().max(500).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({
      userId: mongoId,
    }),
  }),
  unbanUser: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      userId: mongoId,
    }),
  }),
  updateDriver: z.object({
    body: z.object({
      status: z.string().optional(),
      isOnline: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      isApproved: z.boolean().optional(),
      isSuspended: z.boolean().optional(),
      isBlacklisted: z.boolean().optional(),
      car: z.object({
        brand: z.string().optional(),
        model: z.string().optional(),
        color: z.string().optional(),
        plateNumber: z.string().optional(),
        year: z.number().optional(),
      }).optional(),
      commission: z.number().min(0).max(100).optional(),
      maxRadius: z.number().min(0).optional(),
      maxRidesPerDay: z.number().int().min(0).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({
      driverId: mongoId,
    }),
  }),
  addDriver: z.object({
    body: z.object({
      userId: mongoId,
      commission: z.number().min(0).max(100).optional(),
      isApproved: z.boolean().optional(),
      isOnline: z.boolean().optional(),
      car: z.object({
        brand: z.string().min(1),
        model: z.string().min(1),
        year: z.number().int().min(1900).max(2100),
        color: z.string().min(1),
        plateNumber: z.string().min(1),
        seats: z.number().int().min(1).max(20).optional(),
      }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  list: z.object({
    body: z.object({}).optional(),
    query: z.object({
      role: z.string().optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional(),
    params: z.object({}).optional(),
  }),
};

export const foodSchemas = {
  restaurants: z.object({
    body: z.object({}).optional(),
    query: z.object({
      lat: z.string().optional(),
      lng: z.string().optional(),
      radius: z.string().optional(),
    }).optional(),
    params: z.object({}).optional(),
  }),
  restaurantById: z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({
      id: mongoId,
    }),
  }),
  createRestaurant: z.object({
    body: z.object({
      name: z.string({ required_error: 'Name is required' }).min(1),
      description: z.string().optional(),
      logo: z.string().optional(),
      coverImage: z.string().optional(),
      location: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]),
        address: z.string().optional(),
      }),
      phone: z.string({ required_error: 'Phone is required' }).min(1),
      categories: z.array(mongoId).optional(),
      workingHours: z.object({
        open: z.string().optional(),
        close: z.string().optional(),
      }).optional(),
      deliveryFee: z.number().min(0).default(5000).optional(),
      minOrderAmount: z.number().min(0).default(30000).optional(),
      estimatedDeliveryTime: z.number().int().min(1).default(30).optional(),
      cuisine: z.array(z.string()).optional(),
      isOpen: z.boolean().default(false).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  createCategory: z.object({
    body: z.object({
      name: z.string({ required_error: 'Name is required' }).min(1),
      description: z.string().optional(),
      image: z.string().optional(),
      restaurantId: mongoId.optional(),
      isActive: z.boolean().default(true).optional(),
      sortOrder: z.number().int().default(0).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
  createProduct: z.object({
    body: z.object({
      name: z.string({ required_error: 'Name is required' }).min(1),
      description: z.string().optional(),
      price: z.number({ required_error: 'Price is required' }).min(0),
      discountPrice: z.number().min(0).optional(),
      images: z.array(z.string()).optional(),
      categoryId: mongoId,
      restaurantId: mongoId,
      isAvailable: z.boolean().default(true).optional(),
      isFeatured: z.boolean().default(false).optional(),
      preparationTime: z.number().int().min(1).default(10).optional(),
      ingredients: z.array(z.string()).optional(),
      nutritionalInfo: z.object({
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbs: z.number().optional(),
        fat: z.number().optional(),
      }).optional(),
      sortOrder: z.number().int().default(0).optional(),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  }),
};
