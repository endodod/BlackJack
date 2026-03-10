import '../src/index.css'
import '../src/App.css'
import '../src/components/BettingModal.css'
import '../src/components/ResultsModal.css'

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
