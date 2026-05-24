import getHandTotal from "./getHandTotal"

export default function checkWinner({playerHand, dealerHand}) {
    const playertotal = getHandTotal(playerHand)
    const dealertotal = getHandTotal(dealerHand)

    if (playertotal > 21) {
        return 'House Wins'
    }

    if (dealertotal > 21) {
        return 'Player Wins'
    }

    if (dealertotal > playertotal) {
        return 'House Wins'
    }
 
    if (dealertotal < playertotal) {
        return 'Player Wins'
    }
 
    return 'Push'
}