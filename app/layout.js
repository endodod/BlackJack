import '../src/index.css'
import '../src/App.css'
import '../src/components/BettingPanel.css'
import '../src/components/ResultPanel.css'
import ScaleInit from '../src/components/ScaleInit'

export const metadata = {
  title: 'Blackjack',
  description: 'Blackjack game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function applyScale() {
              var baseWidth = 1485;
              var scale = window.innerWidth / baseWidth;
              document.documentElement.style.zoom = scale;
              var realVh = (window.innerHeight / scale) * 0.01;
              document.documentElement.style.setProperty('--real-vh', realVh + 'px');
            }
            applyScale();
            window.addEventListener('resize', applyScale);
          })();
        `}} />
      </head>
      <body className="app-body">
        <ScaleInit />
        {children}
      </body>
    </html>
  )
}