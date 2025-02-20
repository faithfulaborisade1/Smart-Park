import React from 'react';
import Svg, { Path } from 'react-native-svg';

const Arrow = ({ direction = 'up', size = 50, color = 'white' }) => {
  const getRotation = () => {
    switch (direction) {
      case 'down': return '180deg';
      case 'left': return '270deg';
      case 'right': return '90deg';
      default: return '0deg'; // Default is 'up'
    }
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: [{ rotate: getRotation() }] }} // Rotate dynamically
    >
      <Path
        d="M12 19V5M12 5L5 12M12 5L19 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default Arrow;
