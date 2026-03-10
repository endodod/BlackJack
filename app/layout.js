import '../src/index.css'
import '../src/App.css'
import '../src/components/BettingPanel.css'
import '../src/components/ResultPanel.css'

export const metadata = {
  title: 'Blackjack',
  description: 'Blackjack game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
