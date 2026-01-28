import styles from './button.module.css';

export const CarouselButton = ({
  className = '',
}) => {
  return `<button class="${styles.button + (
    className ? ` ${className}` : ''
  )}">Carousel Button</button>`;
};
