'use client';

import React from 'react';
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';

// import required modules
import { EffectCards } from 'swiper/modules';

const SwiperCard: React.FC = () => {
  return (
    <div className="flex justify-center items-center w-full h-full">
      <Swiper
        effect={'cards'}
        grabCursor={true}
        modules={[EffectCards]}
        className="w-60 h-80" // 240px width, 320px height
      >
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-red-600">
          Slide 1
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-blue-500">
          Slide 2
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-green-500">
          Slide 3
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-orange-500">
          Slide 4
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-lime-600">
          Slide 5
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-red-700">
          Slide 6
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-green-800">
          Slide 7
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-blue-700">
          Slide 8
        </SwiperSlide>
        <SwiperSlide className="flex items-center justify-center rounded-2xl text-xl font-bold text-white bg-fuchsia-600">
          Slide 9
        </SwiperSlide>
      </Swiper>
    </div>
  );
};

export default SwiperCard;