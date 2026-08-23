import type { ImageSourcePropType } from 'react-native';

import { absoluteMediaUrl } from './config';

// Metro needs literal require calls so these approved stills travel with every Preview OTA.
const BUNDLED_LESSON_IMAGES: Record<string, ImageSourcePropType> = {
  'unit2_bag.webp': require('../assets/lesson-assets/unit2_bag.webp'),
  'unit2_black.webp': require('../assets/lesson-assets/unit2_black.webp'),
  'unit2_blue.webp': require('../assets/lesson-assets/unit2_blue.webp'),
  'unit2_book.webp': require('../assets/lesson-assets/unit2_book.webp'),
  'unit2_chair.webp': require('../assets/lesson-assets/unit2_chair.webp'),
  'unit2_far_bag.webp': require('../assets/lesson-assets/unit2_far_bag.webp'),
  'unit2_far_blue_bag.webp': require('../assets/lesson-assets/unit2_far_blue_bag.webp'),
  'unit2_far_book.webp': require('../assets/lesson-assets/unit2_far_book.webp'),
  'unit2_far_chair.webp': require('../assets/lesson-assets/unit2_far_chair.webp'),
  'unit2_far_phone.webp': require('../assets/lesson-assets/unit2_far_phone.webp'),
  'unit2_five_black_phones.webp': require('../assets/lesson-assets/unit2_five_black_phones.webp'),
  'unit2_four_yellow_pens.webp': require('../assets/lesson-assets/unit2_four_yellow_pens.webp'),
  'unit2_green.webp': require('../assets/lesson-assets/unit2_green.webp'),
  'unit2_hospital.webp': require('../assets/lesson-assets/unit2_hospital.webp'),
  'unit2_mission_bag_far.webp': require('../assets/lesson-assets/unit2_mission_bag_far.webp'),
  'unit2_mission_book_near.webp': require('../assets/lesson-assets/unit2_mission_book_near.webp'),
  'unit2_mission_bus.webp': require('../assets/lesson-assets/unit2_mission_bus.webp'),
  'unit2_mission_four_yellow_pens.webp': require('../assets/lesson-assets/unit2_mission_four_yellow_pens.webp'),
  'unit2_mission_master.webp': require('../assets/lesson-assets/unit2_mission_master.webp'),
  'unit2_mission_park.webp': require('../assets/lesson-assets/unit2_mission_park.webp'),
  'unit2_mission_school.webp': require('../assets/lesson-assets/unit2_mission_school.webp'),
  'unit2_mission_store.webp': require('../assets/lesson-assets/unit2_mission_store.webp'),
  'unit2_mission_three_green_books.webp': require('../assets/lesson-assets/unit2_mission_three_green_books.webp'),
  'unit2_mission_two_blue_cars.webp': require('../assets/lesson-assets/unit2_mission_two_blue_cars.webp'),
  'unit2_n1.webp': require('../assets/lesson-assets/unit2_n1.webp'),
  'unit2_n10.webp': require('../assets/lesson-assets/unit2_n10.webp'),
  'unit2_n2.webp': require('../assets/lesson-assets/unit2_n2.webp'),
  'unit2_n3.webp': require('../assets/lesson-assets/unit2_n3.webp'),
  'unit2_n4.webp': require('../assets/lesson-assets/unit2_n4.webp'),
  'unit2_n5.webp': require('../assets/lesson-assets/unit2_n5.webp'),
  'unit2_n6.webp': require('../assets/lesson-assets/unit2_n6.webp'),
  'unit2_n7.webp': require('../assets/lesson-assets/unit2_n7.webp'),
  'unit2_n8.webp': require('../assets/lesson-assets/unit2_n8.webp'),
  'unit2_n9.webp': require('../assets/lesson-assets/unit2_n9.webp'),
  'unit2_near_bag.webp': require('../assets/lesson-assets/unit2_near_bag.webp'),
  'unit2_near_book.webp': require('../assets/lesson-assets/unit2_near_book.webp'),
  'unit2_near_chair.webp': require('../assets/lesson-assets/unit2_near_chair.webp'),
  'unit2_near_phone.webp': require('../assets/lesson-assets/unit2_near_phone.webp'),
  'unit2_near_red_book.webp': require('../assets/lesson-assets/unit2_near_red_book.webp'),
  'unit2_one_red_car.webp': require('../assets/lesson-assets/unit2_one_red_car.webp'),
  'unit2_pen.webp': require('../assets/lesson-assets/unit2_pen.webp'),
  'unit2_phone.webp': require('../assets/lesson-assets/unit2_phone.webp'),
  'unit2_red.webp': require('../assets/lesson-assets/unit2_red.webp'),
  'unit2_restaurant.webp': require('../assets/lesson-assets/unit2_restaurant.webp'),
  'unit2_six_white_bags.webp': require('../assets/lesson-assets/unit2_six_white_bags.webp'),
  'unit2_table.webp': require('../assets/lesson-assets/unit2_table.webp'),
  'unit2_three_green_books.webp': require('../assets/lesson-assets/unit2_three_green_books.webp'),
  'unit2_two_blue_cars.webp': require('../assets/lesson-assets/unit2_two_blue_cars.webp'),
  'unit2_white.webp': require('../assets/lesson-assets/unit2_white.webp'),
  'unit2_yellow.webp': require('../assets/lesson-assets/unit2_yellow.webp'),
};

function imageFilename(imageUrl: string): string {
  const cleanPath = imageUrl.split(/[?#]/, 1)[0];
  return cleanPath.slice(cleanPath.lastIndexOf('/') + 1);
}

export function lessonImageSource(imageUrl: string): ImageSourcePropType {
  return BUNDLED_LESSON_IMAGES[imageFilename(imageUrl)] ?? { uri: absoluteMediaUrl(imageUrl) };
}
