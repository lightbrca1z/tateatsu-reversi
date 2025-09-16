// オセロゲーム (Reversi) - 本格実装
class ReversiGame {
    constructor() {
        // ゲーム状態
        this.board = [];
        this.currentPlayer = 1; // 1: 黒, -1: 白
        this.gameMode = 'ai'; // 'ai' or '2p'
        this.aiDifficulty = 2; // 1-3
        this.gameOver = false;
        this.isThinking = false;
        this.history = [];
        this.showHints = false;
        
        // ゲーム統計
        this.gameStats = {
            gamesPlayed: 0,
            playerWins: 0,
            aiWins: 0,
            draws: 0
        };
        
        // DOM要素
        this.boardElement = document.getElementById('board');
        this.blackScoreElement = document.getElementById('blackScore');
        this.whiteScoreElement = document.getElementById('whiteScore');
        this.currentPlayerElement = document.getElementById('currentPlayer');
        this.thinkingElement = document.getElementById('thinking');
        this.gameOverElement = document.getElementById('gameOver');
        
        // 方向ベクトル（8方向）
        this.directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        this.initializeGame();
        this.setupEventListeners();
    }

    // ゲーム初期化
    initializeGame() {
        // ボードを初期化 (8x8)
        this.board = Array(8).fill().map(() => Array(8).fill(0));
        
        // 初期配置
        this.board[3][3] = -1; // 白
        this.board[3][4] = 1;  // 黒
        this.board[4][3] = 1;  // 黒
        this.board[4][4] = -1; // 白
        
        this.currentPlayer = 1; // 黒から開始
        this.gameOver = false;
        this.isThinking = false;
        this.history = [];
        this.showHints = false;
        
        this.createBoard();
        this.updateDisplay();
        this.updatePossibleMoves();
    }

    // ボードのHTML要素を作成
    createBoard() {
        this.boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('click', () => {
                    this.handleCellClick(row, col);
                });
                
                this.boardElement.appendChild(cell);
            }
        }
        
        this.renderBoard();
    }

    // ボードを描画
    renderBoard() {
        const cells = this.boardElement.querySelectorAll('.cell');
        
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const value = this.board[row][col];
            
            // 既存の石とクラスをクリア
            cell.innerHTML = '';
            cell.className = 'cell';
            
            // 石を配置
            if (value !== 0) {
                const stone = document.createElement('div');
                stone.className = `stone ${value === 1 ? 'black' : 'white'}`;
                cell.appendChild(stone);
            }
        });
    }

    // セルクリック処理
    handleCellClick(row, col) {
        if (this.gameOver || this.isThinking) return;
        
        // AI対戦時は白番（プレイヤー）のみ操作可能
        if (this.gameMode === 'ai' && this.currentPlayer === 1) return;
        
        if (this.isValidMove(row, col, this.currentPlayer)) {
            this.makeMove(row, col, this.currentPlayer);
        }
    }

    // 手を打つ
    makeMove(row, col, player, skipAnimation = false) {
        if (!this.isValidMove(row, col, player)) return false;
        
        // 履歴を保存
        this.history.push({
            board: this.board.map(row => [...row]),
            player: this.currentPlayer,
            move: [row, col]
        });
        
        // 石を配置
        this.board[row][col] = player;
        
        // 挟める石をひっくり返す
        const flippedStones = this.getFlippedStones(row, col, player);
        flippedStones.forEach(([r, c]) => {
            this.board[r][c] = player;
        });
        
        // ボードを更新
        this.renderBoard();
        
        // アニメーション（新しい石）
        if (!skipAnimation) {
            this.animateNewStone(row, col);
            
            // ひっくり返るアニメーション
            setTimeout(() => {
                flippedStones.forEach(([r, c]) => {
                    this.animateFlipStone(r, c);
                });
            }, 200);
        }
        
        // 最後に打った手をハイライト
        this.highlightLastMove(row, col);
        
        // プレイヤー交代
        this.currentPlayer *= -1;
        
        // ディスプレイ更新
        this.updateDisplay();
        this.updatePossibleMoves();
        
        // ゲーム終了チェック
        if (this.checkGameEnd()) {
            setTimeout(() => this.endGame(), 1000);
            return true;
        }
        
        // AI対戦時のAI思考
        if (this.gameMode === 'ai' && this.currentPlayer === 1) {
            setTimeout(() => this.makeAIMove(), 500);
        }
        
        return true;
    }

    // 有効な手かチェック
    isValidMove(row, col, player) {
        if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;
        if (this.board[row][col] !== 0) return false;
        
        return this.getFlippedStones(row, col, player).length > 0;
    }

    // ひっくり返せる石を取得
    getFlippedStones(row, col, player) {
        const flipped = [];
        
        for (const [dr, dc] of this.directions) {
            const line = [];
            let r = row + dr;
            let c = col + dc;
            
            // 相手の石を探す
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === -player) {
                line.push([r, c]);
                r += dr;
                c += dc;
            }
            
            // 自分の石で挟めるかチェック
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === player && line.length > 0) {
                flipped.push(...line);
            }
        }
        
        return flipped;
    }

    // 可能な手を取得
    getPossibleMoves(player) {
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

    // 可能な手を表示
    updatePossibleMoves() {
        const cells = this.boardElement.querySelectorAll('.cell');
        const possibleMoves = this.getPossibleMoves(this.currentPlayer);
        
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            
            cell.classList.remove('possible', 'last-move');
            
            if (this.showHints && possibleMoves.some(([r, c]) => r === row && c === col)) {
                // プレイヤーのターンまたは2人対戦時のみヒント表示
                if (this.gameMode === '2p' || 
                    (this.gameMode === 'ai' && this.currentPlayer === -1)) {
                    cell.classList.add('possible');
                }
            }
        });
    }

    // 最後の手をハイライト
    highlightLastMove(row, col) {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('last-move'));
        
        const index = row * 8 + col;
        if (cells[index]) {
            cells[index].classList.add('last-move');
        }
    }

    // 新しい石のアニメーション
    animateNewStone(row, col) {
        const index = row * 8 + col;
        const cell = this.boardElement.children[index];
        const stone = cell.querySelector('.stone');
        
        if (stone) {
            stone.classList.add('new');
            setTimeout(() => stone.classList.remove('new'), 500);
        }
    }

    // 石をひっくり返すアニメーション
    animateFlipStone(row, col) {
        const index = row * 8 + col;
        const cell = this.boardElement.children[index];
        const stone = cell.querySelector('.stone');
        
        if (stone) {
            stone.classList.add('flipping');
            setTimeout(() => {
                stone.className = `stone ${this.board[row][col] === 1 ? 'black' : 'white'}`;
                stone.classList.remove('flipping');
            }, 300);
        }
    }

    // AI思考
    makeAIMove() {
        if (this.gameOver || this.isThinking) return;
        
        this.isThinking = true;
        this.thinkingElement.style.display = 'block';
        
        // AIの思考時間をシミュレート
        const thinkingTime = Math.random() * 1000 + 500;
        
        setTimeout(() => {
            const move = this.getBestMove(this.currentPlayer, this.aiDifficulty);
            
            this.isThinking = false;
            this.thinkingElement.style.display = 'none';
            
            if (move) {
                this.makeMove(move[0], move[1], this.currentPlayer);
            } else {
                // パス
                this.currentPlayer *= -1;
                this.updateDisplay();
                this.updatePossibleMoves();
                
                if (this.checkGameEnd()) {
                    setTimeout(() => this.endGame(), 500);
                }
            }
        }, thinkingTime);
    }

    // AI最善手計算
    getBestMove(player, difficulty) {
        const possibleMoves = this.getPossibleMoves(player);
        
        if (possibleMoves.length === 0) return null;
        
        // 難易度に応じた処理
        switch (difficulty) {
            case 1: // 初級：ランダム + 少し戦略
                return this.getEasyMove(possibleMoves, player);
            case 2: // 中級：中程度の戦略
                return this.getMediumMove(possibleMoves, player);
            case 3: // 上級：ミニマックス
                return this.getHardMove(player);
            default:
                return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }
    }

    // 初級AI
    getEasyMove(possibleMoves, player) {
        // 角を狙う（20%の確率）
        const corners = possibleMoves.filter(([r, c]) => 
            (r === 0 || r === 7) && (c === 0 || c === 7)
        );
        
        if (corners.length > 0 && Math.random() < 0.2) {
            return corners[Math.floor(Math.random() * corners.length)];
        }
        
        // それ以外はランダム
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    // 中級AI
    getMediumMove(possibleMoves, player) {
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const [row, col] of possibleMoves) {
            let score = 0;
            
            // 角の重み
            if ((row === 0 || row === 7) && (col === 0 || col === 7)) {
                score += 100;
            }
            
            // 辺の重み
            if (row === 0 || row === 7 || col === 0 || col === 7) {
                score += 10;
            }
            
            // 角の隣（避ける）
            if (this.isNearCorner(row, col)) {
                score -= 50;
            }
            
            // ひっくり返せる石の数
            score += this.getFlippedStones(row, col, player).length;
            
            // 相手に与える手の数を減らす
            const tempBoard = this.board.map(row => [...row]);
            tempBoard[row][col] = player;
            const flipped = this.getFlippedStones(row, col, player);
            flipped.forEach(([r, c]) => tempBoard[r][c] = player);
            
            const originalBoard = this.board;
            this.board = tempBoard;
            const opponentMoves = this.getPossibleMoves(-player).length;
            this.board = originalBoard;
            
            score -= opponentMoves * 5;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = [row, col];
            }
        }
        
        return bestMove;
    }

    // 上級AI (ミニマックス)
    getHardMove(player) {
        const result = this.minimax(this.board, 4, player, -Infinity, Infinity);
        return result.move;
    }

    // ミニマックス法
    minimax(board, depth, player, alpha, beta) {
        if (depth === 0) {
            return { score: this.evaluateBoard(board, player), move: null };
        }
        
        const originalBoard = this.board;
        this.board = board;
        const possibleMoves = this.getPossibleMoves(player);
        this.board = originalBoard;
        
        if (possibleMoves.length === 0) {
            // パス
            const originalBoard2 = this.board;
            this.board = board;
            const opponentMoves = this.getPossibleMoves(-player);
            this.board = originalBoard2;
            
            if (opponentMoves.length === 0) {
                // ゲーム終了
                return { score: this.evaluateBoard(board, player), move: null };
            } else {
                // 相手のターン
                return this.minimax(board, depth - 1, -player, alpha, beta);
            }
        }
        
        let bestMove = null;
        let bestScore = player === 1 ? -Infinity : Infinity;
        
        for (const [row, col] of possibleMoves) {
            const newBoard = board.map(row => [...row]);
            newBoard[row][col] = player;
            
            const originalBoard = this.board;
            this.board = newBoard;
            const flipped = this.getFlippedStones(row, col, player);
            this.board = originalBoard;
            
            flipped.forEach(([r, c]) => newBoard[r][c] = player);
            
            const result = this.minimax(newBoard, depth - 1, -player, alpha, beta);
            
            if (player === 1) { // 最大化
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestMove = [row, col];
                }
                alpha = Math.max(alpha, bestScore);
            } else { // 最小化
                if (result.score < bestScore) {
                    bestScore = result.score;
                    bestMove = [row, col];
                }
                beta = Math.min(beta, bestScore);
            }
            
            if (beta <= alpha) break; // アルファベータ剪定
        }
        
        return { score: bestScore, move: bestMove };
    }

    // ボード評価
    evaluateBoard(board, player) {
        let score = 0;
        
        // 位置価値テーブル
        const positionValues = [
            [100, -20, 10, 5, 5, 10, -20, 100],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [10, -2, -1, -1, -1, -1, -2, 10],
            [5, -2, -1, -1, -1, -1, -2, 5],
            [5, -2, -1, -1, -1, -1, -2, 5],
            [10, -2, -1, -1, -1, -1, -2, 10],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [100, -20, 10, 5, 5, 10, -20, 100]
        ];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === player) {
                    score += positionValues[row][col];
                } else if (board[row][col] === -player) {
                    score -= positionValues[row][col];
                }
            }
        }
        
        return score;
    }

    // 角の隣かチェック
    isNearCorner(row, col) {
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        
        for (const [cr, cc] of corners) {
            if (Math.abs(row - cr) <= 1 && Math.abs(col - cc) <= 1 && 
                (row !== cr || col !== cc)) {
                return true;
            }
        }
        
        return false;
    }

    // ゲーム終了チェック
    checkGameEnd() {
        const blackMoves = this.getPossibleMoves(1);
        const whiteMoves = this.getPossibleMoves(-1);
        
        return blackMoves.length === 0 && whiteMoves.length === 0;
    }

    // ゲーム終了処理
    endGame() {
        this.gameOver = true;
        
        const { black, white } = this.getScore();
        let result, winner;
        
        if (black > white) {
            result = '黒の勝利！';
            winner = 'black';
        } else if (white > black) {
            result = '白の勝利！';
            winner = 'white';
        } else {
            result = '引き分け！';
            winner = 'draw';
        }
        
        // 統計更新
        this.gameStats.gamesPlayed++;
        if (this.gameMode === 'ai') {
            if (winner === 'white') this.gameStats.playerWins++;
            else if (winner === 'black') this.gameStats.aiWins++;
            else this.gameStats.draws++;
        }
        
        // ゲーム終了画面表示
        document.getElementById('gameOverTitle').textContent = 'ゲーム終了';
        document.getElementById('gameOverResult').textContent = result;
        document.getElementById('gameOverScore').textContent = `黒: ${black} - 白: ${white}`;
        this.gameOverElement.style.display = 'flex';
    }

    // スコア計算
    getScore() {
        let black = 0, white = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === 1) black++;
                else if (this.board[row][col] === -1) white++;
            }
        }
        
        return { black, white };
    }

    // ディスプレイ更新
    updateDisplay() {
        const { black, white } = this.getScore();
        
        this.blackScoreElement.textContent = black;
        this.whiteScoreElement.textContent = white;
        
        // 現在のプレイヤー表示
        const playerText = this.currentPlayer === 1 ? '🎯 黒の番です' : '🎯 白の番です';
        this.currentPlayerElement.textContent = playerText;
        this.currentPlayerElement.className = `current-player ${this.currentPlayer === 1 ? 'black' : 'white'}`;
        
        // AIモード時の表示調整
        if (this.gameMode === 'ai') {
            if (this.currentPlayer === 1) {
                this.currentPlayerElement.textContent = '🤖 AIの番です';
            } else {
                this.currentPlayerElement.textContent = '👤 あなたの番です';
            }
        }
    }

    // イベントリスナー設定
    setupEventListeners() {
        // ゲームコントロール
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.initializeGame();
        });
        
        document.getElementById('vsAIBtn').addEventListener('click', () => {
            this.gameMode = 'ai';
            this.initializeGame();
        });
        
        document.getElementById('vs2PBtn').addEventListener('click', () => {
            this.gameMode = '2p';
            this.initializeGame();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.initializeGame();
        });
        
        // ヒント表示切替
        document.getElementById('hintBtn').addEventListener('click', () => {
            this.showHints = !this.showHints;
            this.updatePossibleMoves();
            
            const btn = document.getElementById('hintBtn');
            btn.textContent = this.showHints ? '💡 ヒント非表示' : '💡 ヒント表示';
        });
        
        // 1手戻す
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoMove();
        });
        
        // 難易度選択
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aiDifficulty = parseInt(btn.dataset.level);
            });
        });
    }

    // 1手戻す
    undoMove() {
        if (this.history.length === 0 || this.isThinking) return;
        
        const lastState = this.history.pop();
        this.board = lastState.board;
        this.currentPlayer = lastState.player;
        this.gameOver = false;
        
        this.renderBoard();
        this.updateDisplay();
        this.updatePossibleMoves();
        
        // ゲーム終了画面を閉じる
        this.gameOverElement.style.display = 'none';
    }
}

// ゲーム終了画面を閉じる
function closeGameOver() {
    document.getElementById('gameOver').style.display = 'none';
    game.initializeGame();
}

// ゲーム開始
let game;

window.addEventListener('load', () => {
    game = new ReversiGame();
    
    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'r':
            case 'R':
                game.initializeGame();
                break;
            case 'h':
            case 'H':
                document.getElementById('hintBtn').click();
                break;
            case 'u':
            case 'U':
                game.undoMove();
                break;
        }
    });
});
