// Game state management
class MultiplicationQuiz {
    constructor() {
        this.currentScreen = 'start';
        this.currentDifficulty = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.startTime = null;
        this.endTime = null;
        this.questionStartTime = null;
        
        // Difficulty ranges
        this.difficulties = {
            easy: { min: 1, max: 4, name: 'Easy (1-4)' },
            medium: { min: 5, max: 8, name: 'Medium (5-8)' },
            hard: { min: 9, max: 12, name: 'Hard (9-12)' }
        };
        
        this.totalQuestions = 20;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.showScreen('start');
        this.loadHighScores();
        this.addTouchImprovements();
    }
    
    bindEvents() {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                this.startQuiz(difficulty);
            });
        });
        
        // Answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const answerIndex = parseInt(e.currentTarget.dataset.answer);
                this.selectAnswer(answerIndex);
            });
        });
        
        // Navigation buttons
        document.getElementById('high-scores-btn').addEventListener('click', () => {
            this.showHighScores();
        });
        
        document.getElementById('quit-quiz-btn').addEventListener('click', () => {
            this.confirmQuitQuiz();
        });
        
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.startQuiz(this.currentDifficulty);
        });
        
        document.getElementById('change-difficulty-btn').addEventListener('click', () => {
            this.showScreen('start');
        });
        
        document.getElementById('view-scores-btn').addEventListener('click', () => {
            this.showHighScores();
        });
        
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.showScreen('start');
        });
        
        document.getElementById('clear-scores-btn').addEventListener('click', () => {
            this.confirmClearScores();
        });
        
        // High score tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.tab;
                this.switchScoreTab(difficulty);
            });
        });
        
        // Modal events
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('modal-confirm').addEventListener('click', () => {
            this.confirmModalAction();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
        
        // Manage focus for accessibility
        this.manageFocus(screenName);
        
        // Announce screen change to screen readers
        const screenLabels = {
            'start': 'Main menu loaded',
            'quiz': 'Quiz started',
            'results': 'Quiz results displayed',
            'high-scores': 'High scores displayed'
        };
        this.announceToScreenReader(screenLabels[screenName] || `${screenName} screen loaded`);
    }
    
    startQuiz(difficulty) {
        this.currentDifficulty = difficulty;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.startTime = new Date();
        
        this.generateQuestions();
        this.showScreen('quiz');
        this.displayQuestion();
        this.startTimer();
        
        // Update difficulty display
        document.getElementById('difficulty-display').textContent = this.difficulties[difficulty].name;
    }
    
    generateQuestions() {
        this.questions = [];
        const range = this.difficulties[this.currentDifficulty];
        const usedQuestions = new Set();
        
        while (this.questions.length < this.totalQuestions) {
            const num1 = this.getRandomNumber(range.min, range.max);
            const num2 = this.getRandomNumber(1, 12);
            const questionKey = `${num1}x${num2}`;
            
            // Avoid duplicate questions
            if (!usedQuestions.has(questionKey)) {
                usedQuestions.add(questionKey);
                const correctAnswer = num1 * num2;
                const wrongAnswers = this.generateWrongAnswers(correctAnswer, num1, num2);
                
                this.questions.push({
                    num1,
                    num2,
                    correctAnswer,
                    answers: this.shuffleAnswers([correctAnswer, ...wrongAnswers]),
                    correctIndex: null // Will be set after shuffling
                });
                
                // Find the correct answer index after shuffling
                const lastQuestion = this.questions[this.questions.length - 1];
                lastQuestion.correctIndex = lastQuestion.answers.indexOf(correctAnswer);
            }
        }
    }
    
    generateWrongAnswers(correct, num1, num2) {
        const wrongAnswers = new Set();
        const attempts = 50; // Prevent infinite loops
        let attemptCount = 0;
        
        while (wrongAnswers.size < 3 && attemptCount < attempts) {
            attemptCount++;
            let wrong;
            
            // Generate plausible wrong answers
            const strategies = [
                () => correct + this.getRandomNumber(1, 10), // Add small number
                () => correct - this.getRandomNumber(1, 10), // Subtract small number
                () => num1 * (num2 + 1), // Off by one in second number
                () => num1 * (num2 - 1), // Off by one in second number
                () => (num1 + 1) * num2, // Off by one in first number
                () => (num1 - 1) * num2, // Off by one in first number
                () => num1 + num2, // Addition instead of multiplication
                () => correct + this.getRandomNumber(10, 20), // Larger difference
            ];
            
            const strategy = strategies[Math.floor(Math.random() * strategies.length)];
            wrong = strategy();
            
            // Ensure wrong answer is positive, different from correct, and reasonable
            if (wrong > 0 && wrong !== correct && wrong < 200) {
                wrongAnswers.add(wrong);
            }
        }
        
        // If we couldn't generate 3 unique wrong answers, fill with random ones
        while (wrongAnswers.size < 3) {
            const wrong = this.getRandomNumber(1, correct + 50);
            if (wrong !== correct) {
                wrongAnswers.add(wrong);
            }
        }
        
        return Array.from(wrongAnswers);
    }
    
    shuffleAnswers(answers) {
        const shuffled = [...answers];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const progress = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
        
        // Update question display
        const questionText = `${question.num1} × ${question.num2} = ?`;
        document.getElementById('question-text').textContent = questionText;
        document.getElementById('question-counter').textContent = `Question ${this.currentQuestionIndex + 1} of ${this.totalQuestions}`;
        
        // Update progress bar with accessibility
        this.updateProgressBar();
        
        // Update answer buttons
        const answerButtons = document.querySelectorAll('.answer-btn');
        answerButtons.forEach((btn, index) => {
            btn.textContent = question.answers[index];
            btn.classList.remove('correct', 'incorrect');
            btn.disabled = false;
            btn.setAttribute('aria-label', `Answer option ${index + 1}: ${question.answers[index]}`);
        });
        
        // Announce new question to screen readers
        this.announceToScreenReader(`Question ${this.currentQuestionIndex + 1}: ${questionText}`);
        
        this.questionStartTime = new Date();
    }
    
    selectAnswer(selectedIndex) {
        const question = this.questions[this.currentQuestionIndex];
        const answerButtons = document.querySelectorAll('.answer-btn');
        const isCorrect = selectedIndex === question.correctIndex;
        
        // Provide haptic feedback on mobile devices
        this.provideHapticFeedback(isCorrect);
        
        // Disable all buttons
        answerButtons.forEach(btn => btn.disabled = true);
        
        // Show visual feedback
        answerButtons[selectedIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect) {
            answerButtons[question.correctIndex].classList.add('correct');
        }
        
        let feedbackMessage;
        if (isCorrect) {
            this.score++;
            feedbackMessage = 'Correct!';
            this.showFeedback('✓', feedbackMessage, 'correct');
        } else {
            feedbackMessage = `Incorrect. The correct answer is ${question.correctAnswer}`;
            this.showFeedback('✗', `Correct answer: ${question.correctAnswer}`, 'incorrect');
        }
        
        // Announce result to screen readers
        this.announceToScreenReader(feedbackMessage);
        
        // Move to next question after delay
        setTimeout(() => {
            this.hideFeedback();
            this.nextQuestion();
        }, 1500);
    }
    
    nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex >= this.totalQuestions) {
            this.endQuiz();
        } else {
            this.displayQuestion();
        }
    }
    
    endQuiz() {
        this.endTime = new Date();
        const totalTime = this.endTime - this.startTime;
        const percentage = Math.round((this.score / this.totalQuestions) * 100);
        
        // Save score
        const scoreData = {
            percentage,
            correct: this.score,
            total: this.totalQuestions,
            time: totalTime,
            date: new Date().toISOString()
        };
        
        const isHighScore = this.saveScore(this.currentDifficulty, scoreData);
        
        // Display results
        document.getElementById('final-score').textContent = `${percentage}%`;
        document.getElementById('final-time').textContent = this.formatTime(totalTime);
        document.getElementById('final-correct').textContent = `${this.score}/${this.totalQuestions}`;
        
        // Show high score notification
        const notification = document.getElementById('high-score-notification');
        if (isHighScore) {
            notification.classList.remove('hidden');
        } else {
            notification.classList.add('hidden');
        }
        
        this.showScreen('results');
    }
    
    saveScore(difficulty, scoreData) {
        const scores = this.getScoresForDifficulty(difficulty);
        scores.push(scoreData);
        
        // Sort scores: percentage desc, then time asc
        scores.sort((a, b) => {
            if (a.percentage !== b.percentage) {
                return b.percentage - a.percentage;
            }
            return a.time - b.time;
        });
        
        // Keep only top 10 scores
        const topScores = scores.slice(0, 10);
        localStorage.setItem(`quiz_scores_${difficulty}`, JSON.stringify(topScores));
        
        // Check if this is a high score (top 3)
        return topScores.slice(0, 3).includes(scoreData);
    }
    
    getScoresForDifficulty(difficulty) {
        const stored = localStorage.getItem(`quiz_scores_${difficulty}`);
        return stored ? JSON.parse(stored) : [];
    }
    
    loadHighScores() {
        Object.keys(this.difficulties).forEach(difficulty => {
            this.displayScoresForDifficulty(difficulty);
        });
    }
    
    displayScoresForDifficulty(difficulty) {
        const scores = this.getScoresForDifficulty(difficulty);
        const container = document.getElementById(`${difficulty}-scores`);
        
        if (scores.length === 0) {
            container.innerHTML = '<div class="no-scores">No scores yet. Play your first quiz!</div>';
            return;
        }
        
        const scoresHTML = scores.map((score, index) => `
            <div class="score-entry">
                <span class="score-rank">#${index + 1}</span>
                <div class="score-details">
                    <div class="score-percentage">${score.percentage}%</div>
                    <div class="score-time">${this.formatTime(score.time)} • ${score.correct}/${score.total} correct</div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = scoresHTML;
    }
    
    showHighScores() {
        this.showScreen('high-scores');
        this.loadHighScores(); // Refresh scores from localStorage
        this.switchScoreTab('easy'); // Default to easy tab
    }
    
    switchScoreTab(difficulty) {
        // Update tab buttons with ARIA
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        const activeTab = document.querySelector(`[data-tab="${difficulty}"]`);
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        
        // Update score lists
        document.querySelectorAll('.scores-list').forEach(list => {
            list.classList.remove('active');
        });
        document.getElementById(`${difficulty}-scores`).classList.add('active');
        
        // Announce tab change
        this.announceToScreenReader(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty scores displayed`);
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = new Date() - this.startTime;
            document.getElementById('timer-display').textContent = this.formatTime(elapsed);
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    showFeedback(icon, text, type) {
        const overlay = document.getElementById('feedback-overlay');
        const iconEl = overlay.querySelector('.feedback-icon');
        const textEl = overlay.querySelector('.feedback-text');
        
        iconEl.textContent = icon;
        textEl.textContent = text;
        
        overlay.classList.remove('hidden');
    }
    
    hideFeedback() {
        document.getElementById('feedback-overlay').classList.add('hidden');
    }
    
    confirmQuitQuiz() {
        this.showModal(
            'Quit Quiz',
            'Are you sure you want to quit? Your progress will be lost.',
            () => {
                this.stopTimer();
                this.showScreen('start');
            }
        );
    }
    
    confirmClearScores() {
        this.showModal(
            'Clear All Scores',
            'This will permanently delete all your high scores. This cannot be undone.',
            () => {
                this.clearAllScores();
            }
        );
    }
    
    clearAllScores() {
        Object.keys(this.difficulties).forEach(difficulty => {
            localStorage.removeItem(`quiz_scores_${difficulty}`);
        });
        this.loadHighScores();
    }
    
    showModal(title, message, confirmAction) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('confirmation-modal').classList.remove('hidden');
        this.pendingModalAction = confirmAction;
    }
    
    hideModal() {
        document.getElementById('confirmation-modal').classList.add('hidden');
        this.pendingModalAction = null;
    }
    
    confirmModalAction() {
        if (this.pendingModalAction) {
            this.pendingModalAction();
        }
        this.hideModal();
    }
    
    handleKeyboard(e) {
        // ESC to close modals/feedback
        if (e.key === 'Escape') {
            this.hideModal();
            this.hideFeedback();
            return;
        }
        
        if (this.currentScreen === 'start') {
            // Arrow key navigation for difficulty buttons
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                this.navigateDifficulty('next');
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                this.navigateDifficulty('prev');
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                const focused = document.activeElement;
                if (focused && focused.classList.contains('difficulty-btn')) {
                    focused.click();
                    e.preventDefault();
                }
            }
        } else if (this.currentScreen === 'quiz') {
            // Number keys 1-4 to select answers
            if (e.key >= '1' && e.key <= '4') {
                const index = parseInt(e.key) - 1;
                const buttons = document.querySelectorAll('.answer-btn');
                if (buttons[index] && !buttons[index].disabled) {
                    this.selectAnswer(index);
                }
            }
            // Arrow keys to navigate answer buttons
            else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.navigateAnswers(e.key);
                e.preventDefault();
            }
        } else if (this.currentScreen === 'high-scores') {
            // Arrow key navigation for tabs
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                this.navigateScoreTabs(e.key === 'ArrowRight' ? 'next' : 'prev');
                e.preventDefault();
            }
        }
    }
    
    navigateDifficulty(direction) {
        const buttons = document.querySelectorAll('.difficulty-btn');
        const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
        let newIndex;
        
        if (currentIndex === -1) {
            newIndex = 0; // Focus first button if none focused
        } else {
            newIndex = direction === 'next' 
                ? (currentIndex + 1) % buttons.length 
                : (currentIndex - 1 + buttons.length) % buttons.length;
        }
        
        buttons[newIndex].focus();
        this.announceToScreenReader(`${buttons[newIndex].getAttribute('aria-label')} selected`);
    }
    
    navigateAnswers(key) {
        const buttons = document.querySelectorAll('.answer-btn:not([disabled])');
        if (buttons.length === 0) return;
        
        const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
        let newIndex;
        
        switch (key) {
            case 'ArrowUp':
            case 'ArrowLeft':
                newIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
                break;
            case 'ArrowDown':
            case 'ArrowRight':
                newIndex = currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1;
                break;
        }
        
        buttons[newIndex].focus();
    }
    
    navigateScoreTabs(direction) {
        const tabs = document.querySelectorAll('.tab-btn');
        const currentIndex = Array.from(tabs).findIndex(tab => tab.classList.contains('active'));
        let newIndex;
        
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % tabs.length;
        } else {
            newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }
        
        tabs[newIndex].click();
        tabs[newIndex].focus();
    }
    
    announceToScreenReader(message) {
        const announcer = document.getElementById('sr-announcements');
        if (announcer) {
            announcer.textContent = message;
            // Clear after screen reader has time to announce
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
    
    updateProgressBar() {
        const progressBar = document.querySelector('.progress-bar');
        const progressFill = document.getElementById('progress-fill');
        
        if (progressBar && progressFill) {
            const percentage = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
            progressBar.setAttribute('aria-valuenow', Math.round(percentage));
            progressBar.setAttribute('aria-valuetext', `Question ${this.currentQuestionIndex + 1} of ${this.totalQuestions}`);
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    manageFocus(screenName) {
        // Set focus to appropriate element when switching screens
        setTimeout(() => {
            let focusTarget;
            
            switch (screenName) {
                case 'start':
                    focusTarget = document.querySelector('.difficulty-btn');
                    break;
                case 'quiz':
                    focusTarget = document.querySelector('.answer-btn');
                    break;
                case 'results':
                    focusTarget = document.querySelector('#play-again-btn');
                    break;
                case 'high-scores':
                    focusTarget = document.querySelector('.tab-btn.active');
                    break;
            }
            
            if (focusTarget) {
                focusTarget.focus();
            }
        }, 100);
    }
    
    provideHapticFeedback(isCorrect) {
        // Provide haptic feedback on supported devices
        if ('vibrate' in navigator) {
            if (isCorrect) {
                // Short, pleasant vibration for correct answers
                navigator.vibrate(100);
            } else {
                // Two quick vibrations for incorrect answers
                navigator.vibrate([50, 50, 50]);
            }
        }
    }
    
    addTouchImprovements() {
        // Add touch event improvements for better mobile experience
        const buttons = document.querySelectorAll('.answer-btn, .difficulty-btn, .tab-btn');
        
        buttons.forEach(button => {
            // Prevent double-tap zoom on buttons
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.98)';
            }, { passive: true });
            
            button.addEventListener('touchend', (e) => {
                button.style.transform = '';
                // Prevent ghost clicks
                e.preventDefault();
            });
            
            button.addEventListener('touchcancel', (e) => {
                button.style.transform = '';
            });
        });
    }
    
    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MultiplicationQuiz();
});

// Add touch event handling for better mobile experience
document.addEventListener('touchstart', function() {}, {passive: true});

// Prevent zoom on double tap for better UX on mobile
document.addEventListener('touchend', function(e) {
    const now = new Date().getTime();
    const timeSince = now - lastTouchEnd;
    if ((timeSince < 300) && (timeSince > 0)) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

let lastTouchEnd = 0;

// Service worker registration for potential offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Note: Service worker implementation would go here for offline functionality
        // This is just a placeholder for future enhancement
    });
}