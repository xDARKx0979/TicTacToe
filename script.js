document.addEventListener('DOMContentLoaded', () => {
    const statusDisplay = document.getElementById('status');
    const cells = document.querySelectorAll('.cell');
    const restartButton = document.getElementById('restart');
    
    let gameActive = true;
    let currentPlayer = 'x';
    let gameState = ['', '', '', '', '', '', '', '', ''];
    
    const winningConditions = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];
    
    const messages = {
        playerTurn: () => `Player ${currentPlayer.toUpperCase()}'s turn`,
        playerWon: () => `Player ${currentPlayer.toUpperCase()} has won!`,
        draw: () => `Game ended in a draw!`
    };
    
    function handleCellClick(clickedCellEvent) {
        const clickedCell = clickedCellEvent.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));
        
        if (gameState[clickedCellIndex] !== '' || !gameActive) {
            return;
        }
        
        gameState[clickedCellIndex] = currentPlayer;
        clickedCell.classList.add(currentPlayer);
        clickedCell.textContent = currentPlayer.toUpperCase();
        
        handleResultValidation();
    }
    
    function handleResultValidation() {
        let roundWon = false;
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            const condition = gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c];
            if (condition) {
                roundWon = true;
                break;
            }
        }
        
        if (roundWon) {
            statusDisplay.textContent = messages.playerWon();
            gameActive = false;
            return;
        }
        
        const roundDraw = !gameState.includes('');
        if (roundDraw) {
            statusDisplay.textContent = messages.draw();
            gameActive = false;
            return;
        }
        
        currentPlayer = currentPlayer === 'x' ? 'o' : 'x';
        statusDisplay.textContent = messages.playerTurn();
    }
    
    function handleRestartGame() {
        gameActive = true;
        currentPlayer = 'x';
        gameState = ['', '', '', '', '', '', '', '', ''];
        statusDisplay.textContent = messages.playerTurn();
        
        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o');
        });
    }
    
    // Event listeners
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    restartButton.addEventListener('click', handleRestartGame);
}); 