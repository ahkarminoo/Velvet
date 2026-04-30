import dbConnect from '../lib/mongodb.js';
import ThaiHoliday from '../models/ThaiHoliday.js';

// Complete 2025 Thai Holidays Database
const THAI_HOLIDAYS_2025 = [
    // JANUARY 2025
    {
        date: new Date('2025-01-01'),
        name: "New Year's Day",
        nameEn: "New Year's Day", 
        nameTh: "วันขึ้นปีใหม่",
        type: "celebration",
        impact: 1.5,
        businessImpact: "high",
        isNationalHoliday: true,
        description: "International New Year celebration",
        recommendedActions: [
            "Premium pricing for dinner celebrations",
            "New Year's Eve packages",
            "Extended hours"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.4,
            familyTableMultiplier: 1.3,
            groupTableMultiplier: 1.5,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },

    // FEBRUARY 2025
    {
        date: new Date('2025-02-12'),
        name: "Makha Bucha Day",
        nameEn: "Makha Bucha Day",
        nameTh: "วันมาघบูชา",
        type: "religious",
        impact: 1.2,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "Important Buddhist holiday",
        recommendedActions: [
            "Respect religious significance",
            "Moderate pricing increase",
            "Vegetarian menu options"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-02-14'),
        name: "Valentine's Day",
        nameEn: "Valentine's Day",
        nameTh: "วันวาเลนไทน์",
        type: "international",
        impact: 1.6,
        businessImpact: "very_high",
        isNationalHoliday: false,
        description: "International romantic celebration",
        recommendedActions: [
            "Premium couple table pricing",
            "Romantic dinner packages",
            "Special couple decorations",
            "Extended dinner hours"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.8,
            familyTableMultiplier: 1.1,
            groupTableMultiplier: 1.0,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },

    // MARCH 2025 
    {
        date: new Date('2025-03-29'),
        name: "Chinese New Year",
        nameEn: "Chinese New Year",
        nameTh: "ตรุษจีน",
        type: "cultural_festival",
        impact: 1.4,
        businessImpact: "high",
        isNationalHoliday: false,
        description: "Chinese lunar new year celebration",
        recommendedActions: [
            "Family group pricing premium",
            "Chinese menu specials",
            "Red decoration themes",
            "Group celebration packages"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.2,
            familyTableMultiplier: 1.4,
            groupTableMultiplier: 1.5,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },

    // APRIL 2025
    {
        date: new Date('2025-04-06'),
        name: "Chakri Day",
        nameEn: "Chakri Memorial Day",
        nameTh: "วันจักรี",
        type: "royal",
        impact: 1.1,
        businessImpact: "low",
        isNationalHoliday: true,
        description: "Commemorates the Chakri Dynasty",
        recommendedActions: [
            "Standard holiday pricing",
            "Royal respect decorations"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.1,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-04-13'),
        name: "Songkran Festival Day 1",
        nameEn: "Songkran Festival Day 1",
        nameTh: "เทศกาลสงกรานต์ วันที่ 1",
        type: "major_festival",
        impact: 2.0,
        businessImpact: "very_high",
        isNationalHoliday: true,
        description: "Thai New Year water festival begins",
        recommendedActions: [
            "Maximum premium pricing",
            "Water festival packages",
            "Tourist-focused marketing",
            "Extended celebration hours",
            "Outdoor seating premium"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.8,
            familyTableMultiplier: 1.9,
            groupTableMultiplier: 2.0,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },
    {
        date: new Date('2025-04-14'),
        name: "Songkran Festival Day 2",
        nameEn: "Songkran Festival Day 2", 
        nameTh: "เทศกาลสงกรานต์ วันที่ 2",
        type: "major_festival",
        impact: 2.0,
        businessImpact: "very_high",
        isNationalHoliday: true,
        description: "Peak day of Songkran celebrations",
        recommendedActions: [
            "Maximum premium pricing",
            "Water festival activities",
            "Tourist packages",
            "Full day celebration pricing"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 2.0,
            familyTableMultiplier: 2.0,
            groupTableMultiplier: 2.0,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },
    {
        date: new Date('2025-04-15'),
        name: "Songkran Festival Day 3",
        nameEn: "Songkran Festival Day 3",
        nameTh: "เทศกาลสงกรานต์ วันที่ 3", 
        type: "major_festival",
        impact: 1.8,
        businessImpact: "very_high",
        isNationalHoliday: true,
        description: "Final day of Songkran celebrations",
        recommendedActions: [
            "High premium pricing",
            "Final celebration packages",
            "Extended hours"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.8,
            familyTableMultiplier: 1.8,
            groupTableMultiplier: 1.9,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },

    // MAY 2025
    {
        date: new Date('2025-05-01'),
        name: "Labour Day",
        nameEn: "Labour Day",
        nameTh: "วันแรงงาน",
        type: "national",
        impact: 1.3,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "International Workers' Day",
        recommendedActions: [
            "Worker-friendly pricing",
            "Family celebration focus",
            "Moderate premium"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.2,
            familyTableMultiplier: 1.3,
            groupTableMultiplier: 1.3,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-05-04'),
        name: "Coronation Day",
        nameEn: "Coronation Day",
        nameTh: "วันพระราชพิธีบรมราชาภิเษก",
        type: "royal",
        impact: 1.2,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "King Vajiralongkorn's Coronation Day",
        recommendedActions: [
            "Royal respect pricing",
            "Traditional decorations",
            "Cultural celebration focus"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.2,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-05-11'),
        name: "Mother's Day",
        nameEn: "Mother's Day",
        nameTh: "วันแม่",
        type: "international",
        impact: 1.4,
        businessImpact: "high",
        isNationalHoliday: false,
        description: "International Mother's Day celebration",
        recommendedActions: [
            "Family dining premium",
            "Mother's Day packages",
            "Multi-generation table focus",
            "Special mother appreciation"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.2,
            familyTableMultiplier: 1.5,
            groupTableMultiplier: 1.4,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },
    {
        date: new Date('2025-05-12'),
        name: "Visakha Bucha Day",
        nameEn: "Visakha Bucha Day",
        nameTh: "วันวิสาขบูชา",
        type: "religious",
        impact: 1.2,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "Buddha's birth, enlightenment, and death",
        recommendedActions: [
            "Religious respect pricing",
            "Vegetarian options",
            "Peaceful atmosphere"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },

    // JUNE 2025
    {
        date: new Date('2025-06-16'),
        name: "Father's Day",
        nameEn: "Father's Day",
        nameTh: "วันพ่อ",
        type: "international",
        impact: 1.4,
        businessImpact: "high",
        isNationalHoliday: false,
        description: "International Father's Day celebration",
        recommendedActions: [
            "Family dining premium",
            "Father's Day packages",
            "Family celebration focus"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.2,
            familyTableMultiplier: 1.4,
            groupTableMultiplier: 1.4,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },

    // JULY 2025
    {
        date: new Date('2025-07-11'),
        name: "Asarnha Bucha Day",
        nameEn: "Asarnha Bucha Day", 
        nameTh: "วันอาสาฬหบูชา",
        type: "religious",
        impact: 1.2,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "Buddha's first sermon",
        recommendedActions: [
            "Religious respect pricing",
            "Traditional Buddhist menu",
            "Peaceful environment"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-07-12'),
        name: "Khao Phansa (Buddhist Lent Begins)",
        nameEn: "Buddhist Lent Day",
        nameTh: "วันเข้าพรรษา",
        type: "religious",
        impact: 1.1,
        businessImpact: "low",
        isNationalHoliday: true,
        description: "Beginning of Buddhist Lent period",
        recommendedActions: [
            "Respectful pricing",
            "Vegetarian focus",
            "Quiet atmosphere"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.0,
            familyTableMultiplier: 1.1,
            groupTableMultiplier: 1.0,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-07-28'),
        name: "King Vajiralongkorn's Birthday",
        nameEn: "King Vajiralongkorn's Birthday",
        nameTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
        type: "royal",
        impact: 1.2,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "Current King's Birthday celebration",
        recommendedActions: [
            "Royal celebration pricing",
            "Traditional decorations",
            "Cultural respect"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.2,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },

    // AUGUST 2025
    {
        date: new Date('2025-08-12'),
        name: "Queen Mother's Birthday",
        nameEn: "Queen Mother's Birthday",
        nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์ พระบรมราชินีนาถ",
        type: "royal",
        impact: 1.1,
        businessImpact: "low",
        isNationalHoliday: true,
        description: "Queen Mother's Birthday and Mother's Day",
        recommendedActions: [
            "Mother-focused pricing",
            "Royal respect",
            "Traditional atmosphere"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.0,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },

    // OCTOBER 2025
    {
        date: new Date('2025-10-13'),
        name: "King Bhumibol Memorial Day",
        nameEn: "King Bhumibol Memorial Day",
        nameTh: "วันคล้าวดวงพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช วันที่ยิ่งใหญ่",
        type: "royal",
        impact: 1.1,
        businessImpact: "low",
        isNationalHoliday: true,
        description: "Memorial for beloved King Bhumibol",
        recommendedActions: [
            "Respectful pricing",
            "Memorial decorations",
            "Traditional atmosphere"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.0,
            familyTableMultiplier: 1.1,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-10-23'),
        name: "Chulalongkorn Day",
        nameEn: "Chulalongkorn Day",
        nameTh: "วันปิยมหาราช",
        type: "royal",
        impact: 1.1,
        businessImpact: "low",
        isNationalHoliday: true,
        description: "Memorial for King Chulalongkorn (Rama V)",
        recommendedActions: [
            "Historical respect pricing",
            "Traditional decorations"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.0,
            familyTableMultiplier: 1.1,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-10-31'),
        name: "Halloween",
        nameEn: "Halloween",
        nameTh: "วันฮัลโลวีน",
        type: "international",
        impact: 1.3,
        businessImpact: "medium",
        isNationalHoliday: false,
        description: "International Halloween celebration",
        recommendedActions: [
            "Theme party pricing",
            "Halloween decorations",
            "Costume-friendly atmosphere",
            "Young adult focus"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.3,
            familyTableMultiplier: 1.2,
            groupTableMultiplier: 1.4,
            peakHoursExtension: true,
            earlyBookingRecommended: false
        }
    },

    // NOVEMBER 2025
    {
        date: new Date('2025-11-15'),
        name: "Loy Krathong",
        nameEn: "Loy Krathong Festival",
        nameTh: "วันลอยกระทง",
        type: "cultural_festival",
        impact: 1.7,
        businessImpact: "very_high",
        isNationalHoliday: false,
        description: "Beautiful water lantern festival",
        recommendedActions: [
            "Premium romantic pricing",
            "Water view table premium",
            "Lantern ceremony packages",
            "Couple-focused marketing",
            "Traditional decorations"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.8,
            familyTableMultiplier: 1.4,
            groupTableMultiplier: 1.3,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },

    // DECEMBER 2025
    {
        date: new Date('2025-12-05'),
        name: "King Bhumibol's Birthday",
        nameEn: "King Bhumibol's Birthday",
        nameTh: "วันคล้ายวันพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร",
        type: "royal",
        impact: 1.2,
        businessImpact: "medium",
        isNationalHoliday: true,
        description: "Beloved King Bhumibol's Birthday and Father's Day",
        recommendedActions: [
            "Father's Day pricing",
            "Royal celebration",
            "Traditional decorations",
            "Family focus"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.1,
            familyTableMultiplier: 1.3,
            groupTableMultiplier: 1.2,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-12-10'),
        name: "Constitution Day",
        nameEn: "Constitution Day",
        nameTh: "วันรัฐธรรมนูญ",
        type: "national",
        impact: 1.1,
        businessImpact: "low",
        isNationalHoliday: true,
        description: "Thai Constitution Day",
        recommendedActions: [
            "Standard holiday pricing",
            "National pride decorations"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.0,
            familyTableMultiplier: 1.1,
            groupTableMultiplier: 1.1,
            peakHoursExtension: false,
            earlyBookingRecommended: false
        }
    },
    {
        date: new Date('2025-12-25'),
        name: "Christmas Day",
        nameEn: "Christmas Day",
        nameTh: "วันคริสต์มาส",
        type: "international",
        impact: 1.5,
        businessImpact: "high",
        isNationalHoliday: false,
        description: "International Christmas celebration",
        recommendedActions: [
            "Christmas premium pricing",
            "Holiday decorations",
            "Family celebration packages",
            "International tourist focus"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 1.4,
            familyTableMultiplier: 1.5,
            groupTableMultiplier: 1.4,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    },
    {
        date: new Date('2025-12-31'),
        name: "New Year's Eve",
        nameEn: "New Year's Eve",
        nameTh: "วันสิ้นปี",
        type: "celebration",
        impact: 2.0,
        businessImpact: "very_high",
        isNationalHoliday: false,
        description: "International New Year's Eve celebration",
        recommendedActions: [
            "Maximum premium pricing",
            "Countdown celebration packages",
            "Extended party hours",
            "Champagne service",
            "Midnight celebration focus"
        ],
        pricingStrategy: {
            coupleTableMultiplier: 2.0,
            familyTableMultiplier: 1.8,
            groupTableMultiplier: 2.0,
            peakHoursExtension: true,
            earlyBookingRecommended: true
        }
    }
];

// Function to seed the database
async function seedThaiHolidays() {
    try {
        await dbConnect();
        
        console.log('🗑️  Clearing existing holiday data...');
        await ThaiHoliday.deleteMany({});
        
        console.log('📅 Seeding Thai holidays for 2025...');
        const result = await ThaiHoliday.insertMany(THAI_HOLIDAYS_2025);
        
        console.log(`✅ Successfully added ${result.length} Thai holidays to database`);
        
        // Show summary
        const holidaysByType = await ThaiHoliday.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    holidays: { $push: '$name' }
                }
            }
        ]);
        
        console.log('\n📊 Holiday Summary by Type:');
        holidaysByType.forEach(type => {
            console.log(`  ${type._id}: ${type.count} holidays`);
            type.holidays.forEach(holiday => {
                console.log(`    - ${holiday}`);
            });
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Error seeding Thai holidays:', error);
        throw error;
    }
}

// Export for use in other files
export { THAI_HOLIDAYS_2025, seedThaiHolidays };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedThaiHolidays()
        .then(() => {
            console.log('🎊 Holiday seeding completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Holiday seeding failed:', error);
            process.exit(1);
        });
}
