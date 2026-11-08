// temporary branch data — will be replaced by backend API later
const branches = [
    {
        id: "iqbal-town",
        name: "GOODSHOT IQBAL TOWN",
        code: "IQB247",
        address: "45-A Main Boulevard, Iqbal Town, Lahore",
        phone: "+92 321 8547123",
        email: "iqbaltown@goodshotclub.com",
        openingHours: "12:00 PM – 2:00 AM (Daily)",
        description:
            "Our flagship branch in the heart of Iqbal Town featuring 6 premium tables, a relaxed lounge area, and a fully stocked canteen. Perfect for casual play and competitive tournaments alike.",
        tables: [
            { name: "Table 1", type: "snooker", pricePerHour: 600, frameRate: 150, centuryRate: 300, status: "available" },
            { name: "Table 2", type: "snooker", pricePerHour: 600, frameRate: 150, centuryRate: 300, status: "available" },
            { name: "Table 3", type: "snooker", pricePerHour: 600, frameRate: 150, centuryRate: 300, status: "occupied" },
            { name: "Table 4", type: "snooker", pricePerHour: 500, frameRate: 120, centuryRate: 250, status: "available" },
            { name: "Table 5", type: "billiard", pricePerHour: 400, frameRate: 100, centuryRate: 200, status: "available" },
            { name: "Table 6", type: "billiard", pricePerHour: 400, frameRate: 100, centuryRate: 200, status: "maintenance" }
        ],
        discounts: [
            { name: "Happy Hours", type: "hourly", value: 25, description: "25% off between 12 PM – 4 PM on weekdays" },
            { name: "Weekend Special", type: "weekly", value: 15, description: "15% off on Saturday & Sunday" }
        ]
    },
    {
        id: "link-road",
        name: "GOODSHOT LINK ROAD",
        code: "LNK392",
        address: "78-B Link Road, Model Town Extension, Lahore",
        phone: "+92 333 7621890",
        email: "linkroad@goodshotclub.com",
        openingHours: "1:00 PM – 3:00 AM (Daily)",
        description:
            "Our newest branch on Link Road with 5 top-quality tables, modern lighting, and a comfortable atmosphere. Ideal for serious players and friendly gatherings.",
        tables: [
            { name: "Table 1", type: "snooker", pricePerHour: 700, frameRate: 180, centuryRate: 350, status: "available" },
            { name: "Table 2", type: "snooker", pricePerHour: 700, frameRate: 180, centuryRate: 350, status: "available" },
            { name: "Table 3", type: "snooker", pricePerHour: 700, frameRate: 180, centuryRate: 350, status: "occupied" },
            { name: "Table 4", type: "billiard", pricePerHour: 500, frameRate: 120, centuryRate: 250, status: "available" },
            { name: "Table 5", type: "billiard", pricePerHour: 500, frameRate: 120, centuryRate: 250, status: "available" }
        ],
        discounts: [
            { name: "Late Night Deal", type: "hourly", value: 20, description: "20% off after 11 PM every night" },
            { name: "Midweek Madness", type: "weekly", value: 15, description: "15% off on Tuesday and Wednesday" }
        ]
    }
];

export default branches;
