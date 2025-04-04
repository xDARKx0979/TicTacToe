document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('next-piece');
    const nextPieceContext = nextPieceCanvas.getContext('2d');
    const holdPieceCanvas = document.getElementById('hold-piece');
    const holdPieceContext = holdPieceCanvas.getContext('2d');
    const startButton = document.getElementById('start');
    const pauseButton = document.getElementById('pause');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    
    context.scale(30, 30);
    nextPieceContext.scale(20, 20);
    holdPieceContext.scale(20, 20);
    
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 1;
    
    // Game state
    let gameStarted = false;
    let gamePaused = false;
    let dropCounter = 0;
    let lastTime = 0;
    let dropInterval = 700;
    let score = 0;
    let level = 1;
    let gameAnimationId;
    let holdPiece = null;
    let canHold = true;
    
    // Initialize the board
    const board = createMatrix(COLS, ROWS);
    
    // Tetromino shapes
    const SHAPES = [
        // I
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        // J
        [
            [2, 0, 0],
            [2, 2, 2],
            [0, 0, 0]
        ],
        // L
        [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0]
        ],
        // O
        [
            [4, 4],
            [4, 4]
        ],
        // S
        [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        // T
        [
            [0, 6, 0],
            [6, 6, 6],
            [0, 0, 0]
        ],
        // Z
        [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ]
    ];
    
    // Colors for each tetromino
    const COLORS = [
        null,
        '#00FFFF', // I - cyan
        '#0000FF', // J - blue
        '#FF7F00', // L - orange
        '#FFFF00', // O - yellow
        '#00FF00', // S - green
        '#800080', // T - purple
        '#FF0000'  // Z - red
    ];
    
    // Player data
    const player = {
        pos: { x: 0, y: 0 },
        matrix: null,
        score: 0
    };
    
    // Next piece data
    let nextPiece = null;
    
    function createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }
    
    function createPiece(type) {
        return SHAPES[type];
    }
    
    function drawMatrix(matrix, offset, ctx = context) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect(x + offset.x, y + offset.y, BLOCK_SIZE, BLOCK_SIZE);
                    
                    // Draw outline
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 0.05;
                    ctx.strokeRect(x + offset.x, y + offset.y, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
    
    function drawGhostPiece() {
        if (!player.matrix) return;
        
        // Create a ghost position
        const ghostPos = { x: player.pos.x, y: player.pos.y };
        
        // Move ghost down until collision
        while (!collide(board, { pos: ghostPos, matrix: player.matrix })) {
            ghostPos.y++;
        }
        
        // Move back up one step (to valid position)
        ghostPos.y--;
        
        // Draw ghost piece
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    context.fillRect(x + ghostPos.x, y + ghostPos.y, BLOCK_SIZE, BLOCK_SIZE);
                    
                    // Draw outline
                    context.strokeStyle = '#fff';
                    context.lineWidth = 0.05;
                    context.strokeRect(x + ghostPos.x, y + ghostPos.y, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
    
    function draw() {
        // Clear canvas
        context.fillStyle = '#111';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the board
        drawMatrix(board, { x: 0, y: 0 });
        
        // Draw ghost piece
        drawGhostPiece();
        
        // Draw the current piece
        if (player.matrix) {
            drawMatrix(player.matrix, player.pos);
        }
        
        // Draw next piece preview
        drawNextPiece();
        
        // Draw hold piece
        drawHoldPiece();
    }
    
    function drawNextPiece() {
        // Clear canvas
        nextPieceContext.fillStyle = '#111';
        nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        if (nextPiece) {
            // Center the piece in the preview
            const offset = { 
                x: (5 - nextPiece[0].length) / 2, 
                y: (5 - nextPiece.length) / 2 
            };
            drawMatrix(nextPiece, offset, nextPieceContext);
        }
    }
    
    function drawHoldPiece() {
        // Clear canvas
        holdPieceContext.fillStyle = '#111';
        holdPieceContext.fillRect(0, 0, holdPieceCanvas.width, holdPieceCanvas.height);
        
        if (holdPiece) {
            // Center the piece in the hold area
            const offset = { 
                x: (5 - holdPiece[0].length) / 2, 
                y: (5 - holdPiece.length) / 2 
            };
            drawMatrix(holdPiece, offset, holdPieceContext);
        }
    }
    
    function merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }
    
    function holdCurrentPiece() {
        if (!canHold) return;
        
        if (holdPiece === null) {
            // First hold - swap with current piece and get a new one
            holdPiece = player.matrix;
            playerReset();
        } else {
            // Swap current piece with held piece
            const temp = player.matrix;
            player.matrix = holdPiece;
            holdPiece = temp;
            
            // Reset position
            player.pos.y = 0;
            player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
            
            // Check if the swap results in a collision
            if (collide(board, player)) {
                // If collision, revert the swap
                player.matrix = holdPiece;
                holdPiece = temp;
                return;
            }
        }
        
        // Disable hold until next piece
        canHold = false;
    }
    
    function rotate(matrix, dir) {
        // Transpose the matrix
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        
        // Reverse each row to get a rotated matrix
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }
    
    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        rotate(player.matrix, dir);
        
        // Handle collision during rotation
        while (collide(board, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
    }
    
    function playerDrop() {
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--;
            merge(board, player);
            playerReset();
            removeRows();
            updateScore();
        }
        dropCounter = 0;
    }
    
    function playerHardDrop() {
        while (!collide(board, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(board, player);
        playerReset();
        removeRows();
        updateScore();
        dropCounter = 0;
    }
    
    function playerMove(offset) {
        player.pos.x += offset;
        if (collide(board, player)) {
            player.pos.x -= offset;
        }
    }
    
    function playerReset() {
        // Set current piece to next piece if available
        if (nextPiece) {
            player.matrix = nextPiece;
        } else {
            const pieces = 'IJLOSTZ';
            player.matrix = createPiece(pieces.length * Math.random() | 0);
        }
        
        // Generate new next piece
        const pieces = 'IJLOSTZ';
        nextPiece = createPiece(pieces.length * Math.random() | 0);
        
        // Position the piece at the top center
        player.pos.y = 0;
        player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
        
        // Enable hold for the new piece
        canHold = true;
        
        // Game over if collision happens immediately
        if (collide(board, player)) {
            // Reset the board
            board.forEach(row => row.fill(0));
            
            // Game over logic
            gameStarted = false;
            startButton.disabled = false;
            pauseButton.disabled = true;
            
            cancelAnimationFrame(gameAnimationId);
            alert(`Game Over! Your score: ${score}`);
            score = 0;
            level = 1;
            holdPiece = null;
            updateScoreDisplay();
        }
    }
    
    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (board[y + o.y] === undefined ||
                    board[y + o.y][x + o.x] === undefined ||
                    board[y + o.y][x + o.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    function removeRows() {
        let rowCount = 0;
        let y = board.length - 1;
        outer: while (y >= 0) {
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 0) {
                    y--;
                    continue outer;
                }
            }
            
            // Remove the completed row
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            
            rowCount++;
        }
        
        // Update score based on rows cleared
        if (rowCount > 0) {
            // Different points for different number of rows cleared
            const points = [0, 40, 100, 300, 1200];
            score += points[rowCount] * level;
            
            // Level up every 15 rows (was 10 - slower progression)
            const totalRows = score / 40; // rough estimate
            level = Math.floor(totalRows / 15) + 1;
            
            // Speed up more gradually as level increases
            dropInterval = Math.max(700 - (level - 1) * 50, 150); // Smaller increments of 50ms (was 100ms)
            
            updateScoreDisplay();
        }
    }
    
    function updateScore() {
        score += 10;
        updateScoreDisplay();
    }
    
    function updateScoreDisplay() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        
        // Update floating score
        const floatingScoreElement = document.getElementById('floating-score');
        if (floatingScoreElement) {
            floatingScoreElement.textContent = score;
        }
    }
    
    function update(time = 0) {
        if (!gameStarted || gamePaused) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
        
        draw();
        gameAnimationId = requestAnimationFrame(update);
    }
    
    document.addEventListener('keydown', event => {
        if (!gameStarted || gamePaused) return;
        
        // Prevent default behavior for game control keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'c', 'C'].includes(event.key)) {
            event.preventDefault();
        }
        
        switch (event.key) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowDown':
                playerDrop();
                break;
            case 'ArrowUp':
                playerRotate(1);
                break;
            case ' ':
                playerHardDrop();
                break;
            case 'c':
            case 'C':
                holdCurrentPiece();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
        }
    });
    
    function startGame() {
        if (gameStarted) return;
        
        gameStarted = true;
        gamePaused = false;
        score = 0;
        level = 1;
        dropInterval = 700;
        holdPiece = null;
        canHold = true;
        
        board.forEach(row => row.fill(0));
        
        startButton.disabled = true;
        pauseButton.disabled = false;
        
        updateScoreDisplay();
        
        const pieces = 'IJLOSTZ';
        nextPiece = createPiece(pieces.length * Math.random() | 0);
        playerReset();
        
        lastTime = 0;
        update();
    }
    
    function togglePause() {
        if (!gameStarted) return;
        
        gamePaused = !gamePaused;
        pauseButton.textContent = gamePaused ? 'Resume' : 'Pause';
        
        if (!gamePaused) {
            lastTime = 0;
            update();
        }
    }
    
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    
    // Initial draw
    draw();
}); 