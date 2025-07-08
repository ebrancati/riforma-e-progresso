import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
  excludePaths?: string[]; // Routes that should NOT scroll to top
  delay?: number; // Delay before scrolling
  smooth?: boolean;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ 
  excludePaths = [], 
  delay = 0,
  smooth = false 
}) => {
  const { pathname } = useLocation();

  useEffect(() => {

    const shouldSkipScroll = excludePaths.some(path => 
      pathname.startsWith(path)
    );

    if (shouldSkipScroll) return;

    const scrollToTop = () => {
      if (smooth) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, 0);
      }
    };

    if (delay > 0) {
      const timer = setTimeout(scrollToTop, delay);
      return () => clearTimeout(timer);
    } else {
      scrollToTop();
    }
  }, [pathname, excludePaths, delay, smooth]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;