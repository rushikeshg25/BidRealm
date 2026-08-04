import { AuctionStatus } from "@prisma/client";

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const daysAgo = (days: number) => addDays(-days);

const addMonths = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

// Statuses used to contradict their own dates — "Mustang 1969" was ENDED with an
// endDate ten days in the future, and "Macbook Pro" was ACTIVE with a startDate
// two days in the future. Every row also had `currentPrice: 0` against a large
// startingPrice, so the bid dialog compared incoming bids against zero.
// The set below deliberately covers all three phases: 2 live, 3 upcoming, 1 ended.

const ITEMS = [
  {
    title: "Mustang 1969",
    image: "https://utfs.io/f/d167f3b5-b5ff-4bca-a8b5-16833eba7a90-yaf61w.jpg",
    categories: "Vehicles",
    status: AuctionStatus.ACTIVE,
    startingPrice: 3000000,
    currentPrice: 3250000,
    startDate: daysAgo(2),
    endDate: addDays(10),
    description:
      "JOHN WICK's car.1969 Limited Edition Mustang E was a rare (about 50 produced) fastback special model designed for economy. It came with a six-cylinder engine (250 cu in (4.1 L)), a high stall torque converter for the standard automatic transmission and a very low, 2.33:1 rear axle ratio.",
  },
  {
    title: "Macbook Pro",
    image: "https://utfs.io/f/49d14369-4ce6-4304-b028-1ef1353271e1-2b7z.jpeg",
    categories: "Electronics",
    status: AuctionStatus.INACTIVE,
    startingPrice: 120000,
    currentPrice: 120000,
    startDate: addDays(2),
    endDate: addMonths(1),
    description:
      "Boost your productivity with this sleek rose gold MacBook Pro. Featuring a vibrant display showcasing rich color gradients, this laptop combines style and substance. The slim profile houses powerful components for smooth performance across various tasks. With its comfortable keyboard, large trackpad, and portability, it's ideal for professionals and creatives alike.",
  },
  {
    title: "Medieval Skates",
    image: "https://utfs.io/f/9dadd8a2-b16a-4840-9cae-b35aea3edd67-xzrd42.avif",
    categories: "Collectables",
    status: AuctionStatus.INACTIVE,
    startingPrice: 2997,
    currentPrice: 2997,
    startDate: addDays(5),
    endDate: addDays(20),
    description:
      "Step back in time with these nostalgic metal roller skates. Dating back to the mid-20th century, these adjustable skates showcase the simple yet sturdy design of a bygone era. The weathered white metal base and worn leather straps tell stories of countless adventures and joyful memories.",
  },
  {
    title: "Chevrolet Lowrider",
    image: "https://utfs.io/f/b10ca0bb-4b9c-4541-9f2f-4627d4ce647f-dskxl8.avif",
    categories: "Vehicles",
    status: AuctionStatus.ACTIVE,
    startingPrice: 500000,
    currentPrice: 560000,
    startDate: daysAgo(3),
    endDate: addDays(5),
    description:
      "Feast your eyes on this stunning 1960s Chevrolet Impala, a true icon of American automotive design. Gleaming in forest green, this classic beauty showcases the era's signature long profile and distinctive rear fins. Parked on a bridge with yellow supports, the Impala's chrome details shine brilliantly, hinting at its well-maintained condition. Perfect for collectors or enthusiasts, this vehicle offers a rare chance to own a piece of automotive history. Imagine cruising down the highway in this symbol of American culture and engineering.",
  },
  {
    title: "Authentic T. rex Skull",
    image: "https://utfs.io/f/ad062102-f649-469e-85b5-5b55cb7f3184-6s5r5h.avif",
    categories: "Collectables",
    status: AuctionStatus.ENDED,
    startingPrice: 20000000,
    currentPrice: 24500000,
    startDate: daysAgo(30),
    endDate: daysAgo(2),
    description:
      "This striking Tyrannosaurus rex skull replica captures the awe-inspiring grandeur of one of history's most fearsome predators. Displayed in museums worldwide, the T. rex skull is an iconic symbol of the dinosaur age, meticulously detailed to reflect every bone and tooth of the original fossil. A perfect centerpiece for collectors, enthusiasts, or museums, this rare piece offers a window into the prehistoric world. Own a monumental artifact that connects the past to the present, showcasing the incredible might of the T. rex.",
  },
  {
    title: "Vintage German Revolver",
    image: "https://utfs.io/f/c5a8ecbd-7a30-498a-90f7-98c88b613373-gc839l.avif",
    categories: "Collectables",
    status: AuctionStatus.INACTIVE,
    startingPrice: 4300000,
    currentPrice: 4300000,
    startDate: addDays(10),
    endDate: addMonths(2),
    description:
      "This classic revolver, produced in Germany by H. Weihrauch Sportwaffen, is a rare find from a bygone era. Sporting a robust design, this firearm is marked by its precise craftsmanship and durable build. The wooden grip, adorned with a checkered pattern, offers an excellent hold, while the solid steel frame guarantees reliability. With its timeless double-action mechanism, this revolver stands as a testament to German engineering. Perfect for collectors and firearm enthusiasts looking for a historical piece, this revolver carries both function and nostalgia in its well-preserved form. Ideal for display or vintage firearm collections.",
  },
];

export default ITEMS;
