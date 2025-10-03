// ゲーム状態管理
class ReversiGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 1; // 1: 黒, -1: 白
        this.gameMode = 'ai'; // 'ai' or '2p'
        this.aiDifficulty = 2;
        this.gameHistory = [];
        this.isAIThinking = false;
        this.initializeBoard();
        this.setupEventListeners();
        this.renderBoard();
        this.updateScore();
    }

    initializeBoard() {
        // 8x8のボードを初期化
        this.board = Array(8).fill().map(() => Array(8).fill(0));
        
        // 初期配置
        this.board[3][3] = -1; // 白
        this.board[3][4] = 1;  // 黒
        this.board[4][3] = 1;  // 黒
        this.board[4][4] = -1; // 白
        
        this.currentPlayer = 1; // 黒から開始
        this.gameHistory = [];
    }

    setupEventListeners() {
        // ボードのクリックイベント
        document.getElementById('board').addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.handleCellClick(row, col);
            }
        });

        // ボタンイベント
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('vsAIBtn').addEventListener('click', () => this.setGameMode('ai'));
        document.getElementById('vs2PBtn').addEventListener('click', () => this.setGameMode('2p'));
        document.getElementById('hintBtn').addEventListener('click', () => this.showHints());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        // 難易度選択
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.aiDifficulty = parseInt(e.target.dataset.level);
            });
        });
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.board[row][col] !== 0) {
                    const stone = document.createElement('div');
                    stone.className = `stone ${this.board[row][col] === 1 ? 'black' : 'white'}`;
                    cell.appendChild(stone);
                }

                boardElement.appendChild(cell);
            }
        }
    }

    handleCellClick(row, col) {
        if (this.isAIThinking) return;
        
        if (this.gameMode === 'ai' && this.currentPlayer === -1) {
            return; // AI の番では人間は操作できない
        }

        if (this.isValidMove(row, col, this.currentPlayer)) {
            this.makeMove(row, col, this.currentPlayer);
            this.renderBoard();
            this.updateScore();
            
            if (this.checkGameEnd()) {
                this.endGame();
                return;
            }

            this.switchPlayer();
            
            // AI の番
            if (this.gameMode === 'ai' && this.currentPlayer === -1) {
                setTimeout(() => this.makeAIMove(), 1000);
            }
        }
    }

    isValidMove(row, col, player) {
        if (this.board[row][col] !== 0) return false;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let [dx, dy] of directions) {
            if (this.checkDirection(row, col, dx, dy, player)) {
                return true;
            }
        }
        return false;
    }

    checkDirection(row, col, dx, dy, player) {
        let x = row + dx;
        let y = col + dy;
        let hasOpponent = false;

        while (x >= 0 && x < 8 && y >= 0 && y < 8) {
            if (this.board[x][y] === 0) return false;
            if (this.board[x][y] === player) return hasOpponent;
            hasOpponent = true;
            x += dx;
            y += dy;
        }
        return false;
    }

    makeMove(row, col, player) {
        this.gameHistory.push(JSON.parse(JSON.stringify(this.board)));
        this.board[row][col] = player;

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (let [dx, dy] of directions) {
            this.flipDirection(row, col, dx, dy, player);
        }
    }

    flipDirection(row, col, dx, dy, player) {
        if (!this.checkDirection(row, col, dx, dy, player)) return;

        let x = row + dx;
        let y = col + dy;

        while (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] === -player) {
            this.board[x][y] = player;
            x += dx;
            y += dy;
        }
    }

    getValidMoves(player) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col, player)) {
                    moves.push([row, col]);
                }
            }
        }
        return moves;
    }

    makeAIMove() {
        this.isAIThinking = true;
        document.getElementById('thinking').style.display = 'block';

        setTimeout(() => {
            const validMoves = this.getValidMoves(this.currentPlayer);
            
            if (validMoves.length === 0) {
                this.switchPlayer();
                this.isAIThinking = false;
                document.getElementById('thinking').style.display = 'none';
                return;
            }

            let bestMove;
            
            switch (this.aiDifficulty) {
                case 1: // 初級：ランダム
                    bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                    break;
                case 2: // 中級：最多獲得
                    bestMove = this.getBestMoveByCount(validMoves);
                    break;
                case 3: // 上級：ミニマックス
                    bestMove = this.getBestMoveByMinimax(validMoves);
                    break;
            }

            this.makeMove(bestMove[0], bestMove[1], this.currentPlayer);
            this.renderBoard();
            this.updateScore();
            
            if (this.checkGameEnd()) {
                this.endGame();
            } else {
                this.switchPlayer();
            }

            this.isAIThinking = false;
            document.getElementById('thinking').style.display = 'none';
        }, 1500);
    }

    getBestMoveByCount(moves) {
        let bestMove = moves[0];
        let maxFlips = 0;

        for (let move of moves) {
            const tempBoard = JSON.parse(JSON.stringify(this.board));
            this.makeMove(move[0], move[1], this.currentPlayer);
            const flips = this.countFlips(tempBoard);
            this.board = tempBoard;

            if (flips > maxFlips) {
                maxFlips = flips;
                bestMove = move;
            }
        }

        return bestMove;
    }

    getBestMoveByMinimax(moves) {
        // 簡単なミニマックス実装
        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (let move of moves) {
            const tempBoard = JSON.parse(JSON.stringify(this.board));
            this.makeMove(move[0], move[1], this.currentPlayer);
            const score = this.evaluateBoard();
            this.board = tempBoard;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    evaluateBoard() {
        // ボード評価（角、辺、中央の重み付け）
        const weights = [
            [100, -20, 10, 5, 5, 10, -20, 100],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [10, -2, -1, -1, -1, -1, -2, 10],
            [5, -2, -1, -1, -1, -1, -2, 5],
            [5, -2, -1, -1, -1, -1, -2, 5],
            [10, -2, -1, -1, -1, -1, -2, 10],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [100, -20, 10, 5, 5, 10, -20, 100]
        ];

        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === this.currentPlayer) {
                    score += weights[row][col];
                } else if (this.board[row][col] === -this.currentPlayer) {
                    score -= weights[row][col];
                }
            }
        }
        return score;
    }

    countFlips(originalBoard) {
        let flips = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (originalBoard[row][col] !== this.board[row][col]) {
                    flips++;
                }
            }
        }
        return flips;
    }

    switchPlayer() {
        this.currentPlayer = -this.currentPlayer;
        this.updateCurrentPlayerDisplay();
        
        // 次のプレイヤーが置ける場所がない場合はパス
        if (this.getValidMoves(this.currentPlayer).length === 0) {
            this.currentPlayer = -this.currentPlayer;
            this.updateCurrentPlayerDisplay();
        }
    }

    updateCurrentPlayerDisplay() {
        const currentPlayerElement = document.getElementById('currentPlayer');
        if (this.currentPlayer === 1) {
            currentPlayerElement.textContent = '🎯 黒の番です';
            currentPlayerElement.className = 'current-player black';
        } else {
            if (this.gameMode === 'ai') {
                currentPlayerElement.textContent = '🤖 AIの番です';
            } else {
                currentPlayerElement.textContent = '🎯 白の番です';
            }
            currentPlayerElement.className = 'current-player white';
        }
    }

    updateScore() {
        let blackCount = 0;
        let whiteCount = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === 1) blackCount++;
                else if (this.board[row][col] === -1) whiteCount++;
            }
        }

        document.getElementById('blackScore').textContent = blackCount;
        document.getElementById('whiteScore').textContent = whiteCount;
    }

    checkGameEnd() {
        const blackMoves = this.getValidMoves(1);
        const whiteMoves = this.getValidMoves(-1);
        
        // 両者とも置ける場所がない、または盤面が埋まった
        return (blackMoves.length === 0 && whiteMoves.length === 0) || 
               this.isBoardFull();
    }

    isBoardFull() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === 0) return false;
            }
        }
        return true;
    }

    endGame() {
        const blackCount = parseInt(document.getElementById('blackScore').textContent);
        const whiteCount = parseInt(document.getElementById('whiteScore').textContent);
        
        let result;
        if (blackCount > whiteCount) {
            result = this.gameMode === 'ai' ? '🎉 あなたの勝利！' : '🎉 黒の勝利！';
        } else if (whiteCount > blackCount) {
            result = this.gameMode === 'ai' ? '🤖 AIの勝利！' : '🎉 白の勝利！';
        } else {
            result = '🤝 引き分け！';
        }

        document.getElementById('gameOverTitle').textContent = 'ゲーム終了';
        document.getElementById('gameOverResult').textContent = result;
        document.getElementById('gameOverScore').textContent = `黒: ${blackCount} - 白: ${whiteCount}`;
        document.getElementById('gameOver').style.display = 'flex';
    }

    showHints() {
        const validMoves = this.getValidMoves(this.currentPlayer);
        
        // 既存のヒントをクリア
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('possible');
        });

        // 有効な手をハイライト
        validMoves.forEach(([row, col]) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('possible');
            }
        });

        // 3秒後にヒントを消す
        setTimeout(() => {
            document.querySelectorAll('.cell').forEach(cell => {
                cell.classList.remove('possible');
            });
        }, 3000);
    }

    undoMove() {
        if (this.gameHistory.length > 0) {
            this.board = this.gameHistory.pop();
            this.currentPlayer = -this.currentPlayer;
            this.renderBoard();
            this.updateScore();
            this.updateCurrentPlayerDisplay();
        }
    }

    setGameMode(mode) {
        this.gameMode = mode;
        this.newGame();
    }

    newGame() {
        this.initializeBoard();
        this.renderBoard();
        this.updateScore();
        this.updateCurrentPlayerDisplay();
        document.getElementById('gameOver').style.display = 'none';
    }

    resetGame() {
        if (confirm('ゲームをリセットしますか？')) {
            this.newGame();
        }
    }
}

// ゲーム終了画面を閉じる
function closeGameOver() {
    document.getElementById('gameOver').style.display = 'none';
    game.newGame();
}

// ゲーム開始
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ReversiGame();
});