import '../src/index.css'
import '../src/App.css'
import '../src/components/BettingPanel.css'
import '../src/components/ResultPanel.css'
import ScaleInit from '../src/components/ScaleInit'
import Providers from '../src/components/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '../src/lib/auth'

export const metadata = {
  title: 'Blackjack',
  description: 'Blackjack game',
}

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function applyScale() {
              var w = window.innerWidth;
              var h = window.innerHeight;
              var baseWidth;
              if (w < 930) {
                baseWidth = h > w ? 430 : 650;
              } else {
                baseWidth = 1485;
              }
              var scale = w / baseWidth;
              document.documentElement.style.zoom = scale;
              var realVh = (h / scale) * 0.01;
              document.documentElement.style.setProperty('--real-vh', realVh + 'px');
            }
            applyScale();
            window.addEventListener('resize', applyScale);
          })();
        `}} />
      </head>
      <body className="app-body">
        <ScaleInit />
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
