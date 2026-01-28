import { CarouselButton } from '../libb';
import styles from './teaser.module.css';

export const Teaser = () => {
  return `
    <div class="${styles.teaser}">
      <h2>Teaser Component</h2>
      ${CarouselButton({
        className: styles.teaserCarouselButton,
      })}
    </div>
  `;
};
