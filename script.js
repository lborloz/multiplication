// Game state management
// Version: 1.2.0 - CSP compliance and security fixes
class MultiplicationQuiz {
    constructor() {
        this.version = '1.3.0';
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
        
        // Achievement tracking
        this.currentStreak = 0;
        this.sessionStats = {
            correct: 0,
            total: 0,
            fastAnswers: 0, // answers under 3 seconds
            perfectStreak: 0
        };
        
        // Progress tracking by multiplication table
        this.tableProgress = this.loadTableProgress();
        
        this.init();
    }
    
    init() {
        this.checkVersion();
        this.bindEvents();
        this.showScreen('start');
        this.loadHighScores();
        this.addTouchImprovements();
        this.checkSharedData();
    }
    
    checkVersion() {
        // Check for version changes and clear old data if needed
        const storedVersion = localStorage.getItem('quiz_app_version');
        
        if (storedVersion !== this.version) {
            console.log(`App updated from ${storedVersion || 'unknown'} to ${this.version}`);
            
            // For major version changes, we might want to migrate or clear old data
            // Currently just storing the new version
            localStorage.setItem('quiz_app_version', this.version);
            
            // If this is a significant update, we could show a notification
            if (!storedVersion) {
                console.log('First time loading the app');
            }
        }
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
        
        // Phase 3: Enhanced high scores features
        document.getElementById('statistics-btn').addEventListener('click', () => {
            this.showStatistics();
        });
        
        document.getElementById('export-scores-btn').addEventListener('click', () => {
            this.exportScoresData();
        });
        
        document.getElementById('import-scores-btn').addEventListener('click', () => {
            this.createAndTriggerFileInput();
        });
        
        document.getElementById('share-scores-btn').addEventListener('click', () => {
            this.showShareModal();
        });
        
        document.getElementById('back-to-scores-btn').addEventListener('click', () => {
            this.showHighScores();
        });
        
        document.getElementById('print-stats-btn').addEventListener('click', () => {
            this.printStatistics();
        });
        
        document.getElementById('export-stats-btn').addEventListener('click', () => {
            this.exportStatisticsData();
        });
        
        document.getElementById('copy-url-btn').addEventListener('click', () => {
            this.copyShareUrl();
        });
        
        document.getElementById('share-modal-close').addEventListener('click', () => {
            this.hideShareModal();
        });
        
        // Name modal handler
        document.getElementById('name-modal-start').addEventListener('click', () => {
            this.saveName();
        });
        
        // Allow Enter key in name input
        document.getElementById('name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveName();
            }
        });
        
        // File import handler will be attached dynamically
        
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
    
    promptForName(difficulty) {
        // Store the selected difficulty for later use
        this.pendingDifficulty = difficulty;
        
        // Show the name modal
        const modal = document.getElementById('name-modal');
        modal.classList.remove('hidden');
        
        // Focus on the name input
        setTimeout(() => {
            document.getElementById('name-input').focus();
        }, 100);
    }
    
    saveName() {
        const nameInput = document.getElementById('name-input');
        const name = nameInput.value.trim();
        
        if (name === '') {
            // Show error feedback
            nameInput.style.borderColor = '#e53e3e';
            nameInput.setAttribute('aria-describedby', 'name-error');
            
            // Create error message if it doesn't exist
            let errorMsg = document.getElementById('name-error');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.id = 'name-error';
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Please enter your name to continue.';
                errorMsg.setAttribute('role', 'alert');
                nameInput.parentNode.appendChild(errorMsg);
            }
            
            nameInput.focus();
            return;
        }
        
        // Save the name to localStorage
        localStorage.setItem('quiz_user_name', name);
        
        // Hide the modal
        document.getElementById('name-modal').classList.add('hidden');
        
        // Clear the input for next time (if ever needed)
        nameInput.value = '';
        nameInput.style.borderColor = '';
        nameInput.removeAttribute('aria-describedby');
        
        // Remove error message if it exists
        const errorMsg = document.getElementById('name-error');
        if (errorMsg) {
            errorMsg.remove();
        }
        
        // Start the quiz with the pending difficulty
        if (this.pendingDifficulty) {
            this.startQuiz(this.pendingDifficulty);
            this.pendingDifficulty = null;
        }
    }
    
    startQuiz(difficulty) {
        // Check if we need to ask for the user's name
        const userName = localStorage.getItem('quiz_user_name');
        if (!userName) {
            this.promptForName(difficulty);
            return;
        }
        
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
        
        // Calculate response time
        const responseTime = new Date() - this.questionStartTime;
        
        // Update session stats
        this.sessionStats.total++;
        if (isCorrect) {
            this.sessionStats.correct++;
            this.currentStreak++;
            this.sessionStats.perfectStreak = Math.max(this.sessionStats.perfectStreak, this.currentStreak);
            
            // Track fast answers (under 3 seconds)
            if (responseTime < 3000) {
                this.sessionStats.fastAnswers++;
            }
        } else {
            this.currentStreak = 0;
        }
        
        // Provide haptic feedback on mobile devices
        this.provideHapticFeedback(isCorrect);
        
        // Disable all buttons
        answerButtons.forEach(btn => btn.disabled = true);
        
        // Show visual feedback
        answerButtons[selectedIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect) {
            answerButtons[question.correctIndex].classList.add('correct');
        }
        
        // Track progress by table
        this.updateTableProgress(question.num1, question.num2, isCorrect, responseTime);
        
        // Check for achievements
        this.checkAchievements(isCorrect, responseTime);
        
        let feedbackMessage;
        if (isCorrect) {
            this.score++;
            feedbackMessage = 'Correct!';
            const encouragement = this.getEncouragement();
            this.showFeedback('✓', `${feedbackMessage} ${encouragement}`, 'correct');
        } else {
            feedbackMessage = `Incorrect. The correct answer is ${question.correctAnswer}`;
            const hint = this.generateLearningHint(question.num1, question.num2, question.correctAnswer);
            const problemText = `${question.num1} × ${question.num2} = ${question.correctAnswer}`;
            this.showFeedback('✗', problemText, 'incorrect', hint);
        }
        
        // Announce result to screen readers
        this.announceToScreenReader(feedbackMessage);
        
        // Handle feedback timing based on answer correctness
        if (isCorrect) {
            // Correct answers: auto-dismiss after short delay (current behavior)
            const delay = 1000;
            this.feedbackTimeout = setTimeout(() => {
                this.hideFeedback();
                this.nextQuestion();
            }, delay);
            
            // Allow skipping feedback with click/tap
            this.enableFeedbackSkip();
        } else {
            // Incorrect answers: stay visible until user taps to dismiss
            this.enableFeedbackSkip();
        }
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
            const userName = localStorage.getItem('quiz_user_name');
            const congratsText = userName ? `Congratulations, ${userName}!` : 'Congratulations!';
            
            // Update the notification text to be personalized
            const notificationTitle = notification.querySelector('h3');
            const notificationMessage = notification.querySelector('p');
            if (notificationTitle) {
                notificationTitle.textContent = `🎉 New High Score!`;
            }
            if (notificationMessage) {
                notificationMessage.textContent = `${congratsText} You achieved a personal best!`;
            }
            
            notification.classList.remove('hidden');
        } else {
            notification.classList.add('hidden');
        }
        
        // Show progress insights
        this.displayProgressInsights();
        
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
    
    showFeedback(icon, text, type, hint = null) {
        const overlay = document.getElementById('feedback-overlay');
        const iconEl = overlay.querySelector('.feedback-icon');
        const textEl = overlay.querySelector('.feedback-text');
        
        iconEl.textContent = icon;
        
        // Different messages for correct vs incorrect answers
        if (hint && type === 'incorrect') {
            textEl.innerHTML = `<div class="feedback-main">${text}</div><div class="feedback-hint">${hint}</div><div class="feedback-skip-hint">Tap to continue</div>`;
        } else if (type === 'incorrect') {
            textEl.innerHTML = `<div class="feedback-main">${text}</div><div class="feedback-skip-hint">Tap to continue</div>`;
        } else {
            // Correct answers can show the original message or auto-dismiss
            textEl.innerHTML = `<div class="feedback-main">${text}</div>`;
        }
        
        overlay.classList.remove('hidden');
        overlay.className = `feedback-overlay ${type}`;
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
            'Clear All Data',
            'This will permanently delete all your high scores, progress data, and saved name. This cannot be undone.',
            () => {
                this.clearAllData();
            }
        );
    }
    
    clearAllScores() {
        Object.keys(this.difficulties).forEach(difficulty => {
            localStorage.removeItem(`quiz_scores_${difficulty}`);
        });
        this.loadHighScores();
    }
    
    clearAllData() {
        // Clear all scores
        Object.keys(this.difficulties).forEach(difficulty => {
            localStorage.removeItem(`quiz_scores_${difficulty}`);
        });
        
        // Clear user name
        localStorage.removeItem('quiz_user_name');
        
        // Clear achievements
        localStorage.removeItem('quiz_achievements');
        
        // Clear table progress
        localStorage.removeItem('quiz_table_progress');
        
        // Clear app version (to trigger fresh start)
        localStorage.removeItem('quiz_app_version');
        
        // Reset table progress to initial state
        this.tableProgress = this.loadTableProgress();
        
        // Refresh displays
        this.loadHighScores();
        
        // Show a confirmation message
        alert('All quiz data has been cleared. You\'ll be asked for your name again when you start a new quiz.');
    }
    
    createAndTriggerFileInput() {
        // Create a temporary file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        fileInput.setAttribute('aria-label', 'Select JSON file to import');
        
        // Add event listener
        fileInput.addEventListener('change', (e) => {
            this.importScoresData(e.target.files[0]);
            // Remove the element after use
            document.body.removeChild(fileInput);
        });
        
        // Add to DOM temporarily and trigger click
        document.body.appendChild(fileInput);
        fileInput.click();
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
                case 'statistics':
                    focusTarget = document.querySelector('#back-to-scores-btn');
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
            let touchStarted = false;
            
            // Prevent double-tap zoom on buttons
            button.addEventListener('touchstart', (e) => {
                touchStarted = true;
                button.style.transform = 'scale(0.98)';
            }, { passive: true });
            
            button.addEventListener('touchend', (e) => {
                button.style.transform = '';
                
                // Don't prevent default on interactive buttons to allow click events
                // Only prevent default for preventing double-tap zoom on non-interactive elements
                touchStarted = false;
            });
            
            button.addEventListener('touchcancel', (e) => {
                button.style.transform = '';
                touchStarted = false;
            });
        });
    }
    
    generateLearningHint(num1, num2, correctAnswer) {
        // Prioritize the most helpful strategies first
        
        // Times 10 rule
        if (num1 === 10) {
            return `💡 Easy! Just add a zero to ${num2}: ${num2}0 = ${correctAnswer}`;
        }
        if (num2 === 10) {
            return `💡 Easy! Just add a zero to ${num1}: ${num1}0 = ${correctAnswer}`;
        }
        
        // Times 1 rule (highest priority after 10s)
        if (num1 === 1) {
            return `💡 Any number × 1 = that same number: ${num2} × 1 = ${num2}`;
        }
        if (num2 === 1) {
            return `💡 Any number × 1 = that same number: ${num1} × 1 = ${num1}`;
        }
        
        const strategies = [
            // Skip counting strategy (only for numbers > 1, and not for 10)
            num1 > 1 && num1 !== 10 && num2 !== 10 ? `💡 Try skip counting by ${num1}: ` + Array.from({length: Math.min(num2, 8)}, (_, i) => num1 * (i + 1)).join(', ') + (num2 > 8 ? '...' : '') : null,
            
            // Breaking down strategy (not for 10s)
            num2 > 5 && num1 !== 10 && num2 !== 10 ? `💡 Break it down: ${num1} × ${num2 - 1} + ${num1} = ${num1 * (num2 - 1)} + ${num1} = ${correctAnswer}` : null,
            
            // Doubling strategy for even numbers > 2 (but not 10)
            num2 % 2 === 0 && num2 > 2 && num1 !== 10 && num2 !== 10 ? `💡 Double it: ${num1} × ${num2/2} × 2 = ${num1 * (num2/2)} × 2 = ${correctAnswer}` : null,
            
            // Commutative property (only when numbers are different)
            num1 !== num2 ? `💡 Remember: ${num1} × ${num2} = ${num2} × ${num1}` : null,
            
            // Visual groups (for smaller numbers)
            num1 <= 4 && num2 <= 4 ? `💡 Think of ${num1} groups of ${num2} things each` : null,
            
            // Same number multiplication - teach a visual/memory strategy
            num1 === num2 ? `💡 Make a ${num1} by ${num1} square! Count all the dots: ${num1} rows of ${num1} = ${correctAnswer}` : null,
            
            
            // Times 2 is doubling
            num1 === 2 ? `💡 ${num2} × 2 means double ${num2}: ${num2} + ${num2} = ${correctAnswer}` : null,
            num2 === 2 ? `💡 ${num1} × 2 means double ${num1}: ${num1} + ${num1} = ${correctAnswer}` : null,
            
            // Times 5 pattern
            num1 === 5 ? `💡 5 × ${num2} = count by 5s: ${num2} times` : null,
            num2 === 5 ? `💡 ${num1} × 5 = count by 5s: ${num1} times` : null
        ].filter(Boolean);
        
        return strategies[Math.floor(Math.random() * strategies.length)];
    }
    
    getEncouragement() {
        const userName = localStorage.getItem('quiz_user_name');
        const basicEncouragements = [
            '🌟', '✨', '🎉', '👏', '💪', '🔥', 'Great!', 'Awesome!', 'Perfect!', 'Excellent!', 'Well done!'
        ];
        
        if (userName) {
            const personalizedEncouragements = [
                `Great job, ${userName}!`, `Excellent, ${userName}!`, `Perfect, ${userName}!`, 
                `Way to go, ${userName}!`, `Outstanding, ${userName}!`, `Amazing, ${userName}!`,
                `Fantastic, ${userName}!`, `Brilliant, ${userName}!`, `Superb, ${userName}!`
            ];
            
            // Mix personalized and basic encouragements
            const allEncouragements = [...personalizedEncouragements, ...basicEncouragements];
            return allEncouragements[Math.floor(Math.random() * allEncouragements.length)];
        }
        
        return basicEncouragements[Math.floor(Math.random() * basicEncouragements.length)];
    }
    
    checkAchievements(isCorrect, responseTime) {
        const achievements = [];
        
        // Streak achievements
        if (this.currentStreak === 5) {
            achievements.push({ type: 'streak', title: 'Hot Streak! 🔥', message: '5 correct answers in a row!' });
        } else if (this.currentStreak === 10) {
            achievements.push({ type: 'streak', title: 'Amazing Streak! ✨', message: '10 correct answers in a row!' });
        } else if (this.currentStreak === 15) {
            achievements.push({ type: 'streak', title: 'Incredible! 🎆', message: '15 correct answers in a row!' });
        }
        
        // Speed achievements
        if (isCorrect && responseTime < 2000 && this.sessionStats.fastAnswers === 5) {
            achievements.push({ type: 'speed', title: 'Speed Demon! ⚡', message: '5 answers under 2 seconds each!' });
        }
        
        // Accuracy achievements  
        const accuracy = (this.sessionStats.correct / this.sessionStats.total) * 100;
        if (this.sessionStats.total >= 10 && accuracy === 100) {
            achievements.push({ type: 'accuracy', title: 'Perfect Score! 🎆', message: 'All answers correct!' });
        }
        
        // Show achievements
        achievements.forEach(achievement => {
            setTimeout(() => {
                this.showAchievement(achievement);
            }, 1000);
        });
    }
    
    showAchievement(achievement) {
        // Create achievement notification
        const achievementEl = document.createElement('div');
        achievementEl.className = 'achievement-notification';
        achievementEl.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-message">${achievement.message}</div>
            </div>
        `;
        
        document.body.appendChild(achievementEl);
        
        // Animate in
        setTimeout(() => {
            achievementEl.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            achievementEl.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(achievementEl);
            }, 500);
        }, 3000);
        
        // Announce to screen readers
        this.announceToScreenReader(`Achievement unlocked: ${achievement.title} ${achievement.message}`);
        
        // Save achievement
        this.saveAchievement(achievement);
    }
    
    saveAchievement(achievement) {
        const achievements = JSON.parse(localStorage.getItem('quiz_achievements') || '[]');
        achievement.date = new Date().toISOString();
        achievement.difficulty = this.currentDifficulty;
        achievements.push(achievement);
        localStorage.setItem('quiz_achievements', JSON.stringify(achievements));
    }
    
    loadTableProgress() {
        const saved = localStorage.getItem('quiz_table_progress');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Initialize progress tracking for tables 1-12
        const progress = {};
        for (let i = 1; i <= 12; i++) {
            progress[i] = {
                correct: 0,
                total: 0,
                averageTime: 0,
                recentAttempts: [], // Last 10 attempts
                mastered: false // 90%+ accuracy over last 10 attempts
            };
        }
        return progress;
    }
    
    updateTableProgress(num1, num2, isCorrect, responseTime) {
        // Update progress for both numbers (since 4×3 = 3×4)
        [num1, num2].forEach(num => {
            if (num >= 1 && num <= 12) {
                const table = this.tableProgress[num];
                
                // Update basic stats
                table.total++;
                if (isCorrect) {
                    table.correct++;
                }
                
                // Update recent attempts (keep last 10)
                table.recentAttempts.push({ correct: isCorrect, time: responseTime });
                if (table.recentAttempts.length > 10) {
                    table.recentAttempts.shift();
                }
                
                // Calculate average time
                const totalTime = table.recentAttempts.reduce((sum, attempt) => sum + attempt.time, 0);
                table.averageTime = totalTime / table.recentAttempts.length;
                
                // Check mastery (90%+ accuracy over last 10 attempts)
                if (table.recentAttempts.length >= 10) {
                    const recentCorrect = table.recentAttempts.filter(a => a.correct).length;
                    table.mastered = (recentCorrect / table.recentAttempts.length) >= 0.9;
                }
            }
        });
        
        // Save progress
        this.saveTableProgress();
    }
    
    saveTableProgress() {
        localStorage.setItem('quiz_table_progress', JSON.stringify(this.tableProgress));
    }
    
    getTableStats() {
        const stats = [];
        for (let i = 1; i <= 12; i++) {
            const table = this.tableProgress[i];
            if (table.total > 0) {
                const accuracy = Math.round((table.correct / table.total) * 100);
                const avgTime = Math.round(table.averageTime / 1000 * 10) / 10; // seconds with 1 decimal
                
                stats.push({
                    table: i,
                    accuracy,
                    avgTime,
                    total: table.total,
                    mastered: table.mastered,
                    needsPractice: accuracy < 70 && table.total >= 5
                });
            }
        }
        
        return stats.sort((a, b) => {
            // Sort by needs practice first, then by accuracy
            if (a.needsPractice && !b.needsPractice) return -1;
            if (!a.needsPractice && b.needsPractice) return 1;
            return a.accuracy - b.accuracy;
        });
    }
    
    showProgressInsights() {
        const stats = this.getTableStats();
        
        if (stats.length === 0) {
            return 'Keep practicing to see your progress! 💪';
        }
        
        const mastered = stats.filter(s => s.mastered);
        const needsPractice = stats.filter(s => s.needsPractice);
        
        let message = '';
        
        if (mastered.length > 0) {
            message += `🌟 Mastered tables: ${mastered.map(s => s.table).join(', ')}\n`;
        }
        
        if (needsPractice.length > 0) {
            message += `🎯 Focus on tables: ${needsPractice.map(s => s.table).join(', ')}`;
        } else if (mastered.length > 0) {
            message += `🎆 Great job! Keep up the excellent work!`;
        }
        
        return message;
    }
    
    displayProgressInsights() {
        const insights = this.showProgressInsights();
        let insightsContainer = document.getElementById('progress-insights');
        
        if (!insightsContainer) {
            // Create insights container if it doesn't exist
            insightsContainer = document.createElement('div');
            insightsContainer.id = 'progress-insights';
            insightsContainer.className = 'progress-insights';
            
            const resultsMain = document.querySelector('.results-main');
            const actionsDiv = document.querySelector('.results-actions');
            resultsMain.insertBefore(insightsContainer, actionsDiv);
        }
        
        insightsContainer.innerHTML = `
            <h3>📊 Your Progress</h3>
            <div class="insights-content">${insights.replace(/\n/g, '<br>')}</div>
        `;
    }
    
    enableFeedbackSkip() {
        const overlay = document.getElementById('feedback-overlay');
        
        const skipFeedback = (e) => {
            // Prevent event from bubbling to elements underneath
            e.preventDefault();
            e.stopPropagation();
            
            // Clear auto-dismiss timeout if it exists
            if (this.feedbackTimeout) {
                clearTimeout(this.feedbackTimeout);
                this.feedbackTimeout = null;
            }
            
            // Hide feedback immediately
            this.hideFeedback();
            
            // Remove event listeners
            overlay.removeEventListener('click', skipFeedback);
            overlay.removeEventListener('touchend', skipFeedback);
            document.removeEventListener('keydown', keySkip);
            
            // Add delay before going to next question to prevent accidental clicks
            setTimeout(() => {
                this.nextQuestion();
            }, 100);
        };
        
        // Add click/touch handlers to skip feedback
        overlay.addEventListener('click', skipFeedback);
        overlay.addEventListener('touchend', skipFeedback);
        
        // Also allow space/enter to skip
        const keySkip = (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                skipFeedback(e);
            }
        };
        
        document.addEventListener('keydown', keySkip);
    }
    
    // Phase 3: Enhanced High Scores Features
    
    exportScoresData() {
        const exportData = {
            version: '3.0',
            exportDate: new Date().toISOString(),
            scores: {},
            tableProgress: this.tableProgress,
            achievements: JSON.parse(localStorage.getItem('quiz_achievements') || '[]')
        };
        
        // Export all difficulty scores
        Object.keys(this.difficulties).forEach(difficulty => {
            exportData.scores[difficulty] = this.getScoresForDifficulty(difficulty);
        });
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `multiplication-quiz-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.announceToScreenReader('Quiz data exported successfully');
    }
    
    async importScoresData(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data
            if (!importData.version || !importData.scores) {
                throw new Error('Invalid file format');
            }
            
            const confirmImport = confirm(
                `Import data from ${new Date(importData.exportDate).toLocaleDateString()}?\n\n` +
                `This will merge with your existing data. Continue?`
            );
            
            if (confirmImport) {
                // Import scores
                Object.keys(importData.scores).forEach(difficulty => {
                    const existingScores = this.getScoresForDifficulty(difficulty);
                    const importedScores = importData.scores[difficulty] || [];
                    
                    // Merge and sort scores
                    const mergedScores = [...existingScores, ...importedScores];
                    mergedScores.sort((a, b) => {
                        if (a.percentage !== b.percentage) {
                            return b.percentage - a.percentage;
                        }
                        return a.time - b.time;
                    });
                    
                    // Keep only top 20 scores to prevent bloat
                    const topScores = mergedScores.slice(0, 20);
                    localStorage.setItem(`quiz_scores_${difficulty}`, JSON.stringify(topScores));
                });
                
                // Import table progress if available
                if (importData.tableProgress) {
                    // Merge table progress data
                    Object.keys(importData.tableProgress).forEach(table => {
                        if (this.tableProgress[table]) {
                            const imported = importData.tableProgress[table];
                            this.tableProgress[table].total += imported.total || 0;
                            this.tableProgress[table].correct += imported.correct || 0;
                            
                            // Merge recent attempts (keep most recent 10)
                            if (imported.recentAttempts) {
                                this.tableProgress[table].recentAttempts.push(...imported.recentAttempts);
                                this.tableProgress[table].recentAttempts = 
                                    this.tableProgress[table].recentAttempts.slice(-10);
                            }
                        }
                    });
                    this.saveTableProgress();
                }
                
                // Import achievements if available
                if (importData.achievements) {
                    const existingAchievements = JSON.parse(localStorage.getItem('quiz_achievements') || '[]');
                    const mergedAchievements = [...existingAchievements, ...importData.achievements];
                    localStorage.setItem('quiz_achievements', JSON.stringify(mergedAchievements));
                }
                
                // Refresh displays
                this.loadHighScores();
                this.announceToScreenReader('Data imported successfully');
                
                alert('Data imported successfully! Your scores and progress have been merged.');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing data. Please check the file format and try again.');
        }
        
        // Note: File input is now created dynamically and removed after use
    }
    
    showStatistics() {
        this.displayOverallStats();
        this.displayDifficultyStats();
        this.displayScoreChart();
        this.displayMasteryGrid();
        this.displayRecentAchievements();
        this.showScreen('statistics');
    }
    
    displayOverallStats() {
        const allScores = [];
        let totalQuizzes = 0;
        let totalPlayTime = 0;
        
        Object.keys(this.difficulties).forEach(difficulty => {
            const scores = this.getScoresForDifficulty(difficulty);
            allScores.push(...scores);
            totalQuizzes += scores.length;
            totalPlayTime += scores.reduce((sum, score) => sum + (score.time || 0), 0);
        });
        
        const avgScore = allScores.length > 0 
            ? Math.round(allScores.reduce((sum, score) => sum + score.percentage, 0) / allScores.length)
            : 0;
            
        // Calculate best streak from achievements
        const achievements = JSON.parse(localStorage.getItem('quiz_achievements') || '[]');
        const streakAchievements = achievements.filter(a => a.type === 'streak');
        const bestStreak = streakAchievements.length > 0 
            ? Math.max(...streakAchievements.map(a => parseInt(a.message.match(/\d+/)[0])))
            : 0;
        
        const totalTimeMinutes = Math.round(totalPlayTime / 60000);
        
        document.getElementById('total-quizzes').textContent = totalQuizzes;
        document.getElementById('avg-score').textContent = `${avgScore}%`;
        document.getElementById('best-streak').textContent = bestStreak;
        document.getElementById('total-time').textContent = `${totalTimeMinutes}m`;
    }
    
    displayDifficultyStats() {
        const container = document.getElementById('difficulty-stats');
        container.innerHTML = '';
        
        Object.keys(this.difficulties).forEach(difficulty => {
            const scores = this.getScoresForDifficulty(difficulty);
            
            if (scores.length === 0) {
                return; // Skip difficulties with no scores
            }
            
            const avgScore = Math.round(
                scores.reduce((sum, score) => sum + score.percentage, 0) / scores.length
            );
            
            const avgTime = Math.round(
                scores.reduce((sum, score) => sum + score.time, 0) / scores.length / 1000
            );
            
            const bestScore = Math.max(...scores.map(s => s.percentage));
            
            const difficultyEl = document.createElement('div');
            difficultyEl.className = 'difficulty-stat';
            difficultyEl.innerHTML = `
                <div class="difficulty-name">${this.difficulties[difficulty].name}</div>
                <div class="difficulty-performance">
                    <div class="performance-metric">
                        <div class="performance-value">${avgScore}%</div>
                        <div class="performance-label">Avg Score</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-value">${avgTime}s</div>
                        <div class="performance-label">Avg Time</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-value">${bestScore}%</div>
                        <div class="performance-label">Best Score</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-value">${scores.length}</div>
                        <div class="performance-label">Total Plays</div>
                    </div>
                </div>
            `;
            container.appendChild(difficultyEl);
        });
    }
    
    displayScoreChart() {
        const canvas = document.getElementById('scores-chart');
        const fallback = document.getElementById('chart-fallback');
        const fallbackText = document.getElementById('chart-data-text');
        
        // Get recent scores (last 20 across all difficulties)
        const allScores = [];
        Object.keys(this.difficulties).forEach(difficulty => {
            const scores = this.getScoresForDifficulty(difficulty);
            scores.forEach(score => {
                allScores.push({
                    ...score,
                    difficulty: difficulty,
                    date: new Date(score.date)
                });
            });
        });
        
        allScores.sort((a, b) => a.date - b.date);
        const recentScores = allScores.slice(-20);
        
        if (recentScores.length === 0) {
            fallback.classList.remove('hidden');
            fallbackText.textContent = 'No quiz data available yet. Complete some quizzes to see your progress!';
            return;
        }
        
        // Try to render chart using Canvas API
        try {
            const ctx = canvas.getContext('2d');
            this.drawScoreChart(ctx, recentScores, canvas.width, canvas.height);
            fallback.classList.add('hidden');
        } catch (error) {
            // Fallback to text representation
            console.log('Chart rendering failed, using text fallback:', error);
            fallback.classList.remove('hidden');
            
            const textData = recentScores.map((score, index) => 
                `${index + 1}. ${score.percentage}% (${score.difficulty}, ${new Date(score.date).toLocaleDateString()})`
            ).join('<br>');
            
            fallbackText.innerHTML = `Recent Scores:<br>${textData}`;
        }
    }
    
    drawScoreChart(ctx, scores, width, height) {
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up styles
        ctx.fillStyle = '#f8f9ff';
        ctx.fillRect(0, 0, width, height);
        
        if (scores.length === 0) return;
        
        // Calculate scales
        const maxScore = Math.max(...scores.map(s => s.percentage));
        const minScore = Math.min(...scores.map(s => s.percentage));
        const scoreRange = maxScore - minScore || 1;
        
        // Draw grid lines
        ctx.strokeStyle = '#e0e7ff';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines (score percentages)
        for (let i = 0; i <= 10; i++) {
            const y = padding + (i / 10) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            // Labels
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`${100 - i * 10}%`, padding - 5, y + 4);
        }
        
        // Vertical grid lines
        const stepSize = Math.max(1, Math.floor(scores.length / 5));
        for (let i = 0; i < scores.length; i += stepSize) {
            const x = padding + (i / (scores.length - 1)) * chartWidth;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        // Draw score line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        scores.forEach((score, index) => {
            const x = padding + (index / (scores.length - 1)) * chartWidth;
            const y = height - padding - ((score.percentage - minScore) / scoreRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#667eea';
        scores.forEach((score, index) => {
            const x = padding + (index / (scores.length - 1)) * chartWidth;
            const y = height - padding - ((score.percentage - minScore) / scoreRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Score Progress Over Time', width / 2, 25);
    }
    
    displayMasteryGrid() {
        const container = document.getElementById('mastery-grid');
        container.innerHTML = '';
        
        for (let table = 1; table <= 12; table++) {
            const progress = this.tableProgress[table];
            const cell = document.createElement('div');
            cell.className = 'mastery-cell';
            cell.textContent = table;
            
            let status, accuracy = 0;
            if (progress.total === 0) {
                status = 'not-attempted';
                cell.title = `${table}x table: Not practiced yet`;
            } else {
                accuracy = Math.round((progress.correct / progress.total) * 100);
                if (progress.mastered) {
                    status = 'mastered';
                    cell.title = `${table}x table: Mastered! ${accuracy}% accuracy (${progress.total} attempts)`;
                } else if (accuracy >= 70) {
                    status = 'learning';
                    cell.title = `${table}x table: Learning - ${accuracy}% accuracy (${progress.total} attempts)`;
                } else {
                    status = 'needs-practice';
                    cell.title = `${table}x table: Needs practice - ${accuracy}% accuracy (${progress.total} attempts)`;
                }
            }
            
            cell.classList.add(status);
            container.appendChild(cell);
        }
    }
    
    displayRecentAchievements() {
        const container = document.getElementById('achievements-list');
        const achievements = JSON.parse(localStorage.getItem('quiz_achievements') || '[]');
        
        if (achievements.length === 0) {
            container.innerHTML = '<div class="no-achievements">No achievements yet. Keep playing to unlock achievements!</div>';
            return;
        }
        
        // Sort by date (most recent first) and take last 10
        const recentAchievements = achievements
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        container.innerHTML = recentAchievements.map(achievement => {
            const icon = this.getAchievementIcon(achievement.type);
            const date = new Date(achievement.date).toLocaleDateString();
            
            return `
                <div class="achievement-item">
                    <div class="achievement-icon">${icon}</div>
                    <div class="achievement-details">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.message}</div>
                        <div class="achievement-date">${date} • ${achievement.difficulty} difficulty</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getAchievementIcon(type) {
        const icons = {
            streak: '🔥',
            speed: '⚡',
            accuracy: '🎯',
            perfect: '🌟',
            improvement: '📈',
            dedication: '💪'
        };
        return icons[type] || '🏆';
    }
    
    showShareModal() {
        const modal = document.getElementById('share-modal');
        const summary = document.getElementById('share-summary');
        const urlInput = document.getElementById('share-url');
        
        // Generate share data
        const shareData = this.generateShareData();
        const shareUrl = this.generateShareUrl(shareData);
        
        urlInput.value = shareUrl;
        
        // Display summary
        const userName = shareData.userName || 'Your';
        summary.innerHTML = `
            <h4>${userName}'s Multiplication Quiz Stats</h4>
            <div class="share-stats">
                <div class="share-stat">
                    <div class="share-stat-value">${shareData.totalQuizzes}</div>
                    <div class="share-stat-label">Total Quizzes</div>
                </div>
                <div class="share-stat">
                    <div class="share-stat-value">${shareData.avgScore}%</div>
                    <div class="share-stat-label">Average Score</div>
                </div>
                <div class="share-stat">
                    <div class="share-stat-value">${shareData.bestScore}%</div>
                    <div class="share-stat-label">Best Score</div>
                </div>
                <div class="share-stat">
                    <div class="share-stat-value">${shareData.masteredTables}</div>
                    <div class="share-stat-label">Tables Mastered</div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
    
    generateShareData() {
        const allScores = [];
        Object.keys(this.difficulties).forEach(difficulty => {
            allScores.push(...this.getScoresForDifficulty(difficulty));
        });
        
        const totalQuizzes = allScores.length;
        const avgScore = totalQuizzes > 0 
            ? Math.round(allScores.reduce((sum, score) => sum + score.percentage, 0) / totalQuizzes)
            : 0;
        const bestScore = totalQuizzes > 0 ? Math.max(...allScores.map(s => s.percentage)) : 0;
        
        const masteredTables = Object.values(this.tableProgress)
            .filter(progress => progress.mastered).length;
            
        const userName = localStorage.getItem('quiz_user_name');
        
        return {
            userName: userName || 'Anonymous Player',
            totalQuizzes,
            avgScore,
            bestScore,
            masteredTables,
            timestamp: Date.now()
        };
    }
    
    generateShareUrl(data) {
        const baseUrl = window.location.origin + window.location.pathname;
        const encodedData = btoa(JSON.stringify(data));
        return `${baseUrl}?share=${encodedData}`;
    }
    
    copyShareUrl() {
        const urlInput = document.getElementById('share-url');
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(urlInput.value).then(() => {
                const btn = document.getElementById('copy-url-btn');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = '#4CAF50';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
                
                this.announceToScreenReader('Share URL copied to clipboard');
            }).catch(() => {
                this.fallbackCopyUrl(urlInput);
            });
        } else {
            this.fallbackCopyUrl(urlInput);
        }
    }
    
    fallbackCopyUrl(urlInput) {
        urlInput.select();
        urlInput.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            alert('Share URL copied to clipboard!');
            this.announceToScreenReader('Share URL copied to clipboard');
        } catch (err) {
            alert('Please manually copy the URL from the text field.');
        }
    }
    
    hideShareModal() {
        document.getElementById('share-modal').classList.add('hidden');
    }
    
    printStatistics() {
        const originalTitle = document.title;
        document.title = 'Multiplication Quiz Statistics Report';
        
        // Hide non-statistics screens
        document.querySelectorAll('.screen').forEach(screen => {
            if (screen.id !== 'statistics-screen') {
                screen.style.display = 'none';
            }
        });
        
        window.print();
        
        // Restore original state
        document.title = originalTitle;
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = '';
        });
    }
    
    exportStatisticsData() {
        const statsData = {
            version: '3.0',
            exportDate: new Date().toISOString(),
            overallStats: {
                totalQuizzes: parseInt(document.getElementById('total-quizzes').textContent),
                avgScore: document.getElementById('avg-score').textContent,
                bestStreak: parseInt(document.getElementById('best-streak').textContent),
                totalTime: document.getElementById('total-time').textContent
            },
            difficultyStats: {},
            tableProgress: this.tableProgress,
            achievements: JSON.parse(localStorage.getItem('quiz_achievements') || '[]'),
            allScores: {}
        };
        
        // Add difficulty stats
        Object.keys(this.difficulties).forEach(difficulty => {
            const scores = this.getScoresForDifficulty(difficulty);
            statsData.allScores[difficulty] = scores;
            
            if (scores.length > 0) {
                statsData.difficultyStats[difficulty] = {
                    avgScore: Math.round(scores.reduce((sum, s) => sum + s.percentage, 0) / scores.length),
                    avgTime: Math.round(scores.reduce((sum, s) => sum + s.time, 0) / scores.length / 1000),
                    bestScore: Math.max(...scores.map(s => s.percentage)),
                    totalPlays: scores.length
                };
            }
        });
        
        const dataStr = JSON.stringify(statsData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `multiplication-quiz-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.announceToScreenReader('Statistics exported successfully');
    }
    
    // Check for shared data on page load
    checkSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('share');
        
        if (sharedData) {
            try {
                const data = JSON.parse(atob(sharedData));
                this.displaySharedStats(data);
            } catch (error) {
                console.log('Invalid share data:', error);
            }
        }
    }
    
    displaySharedStats(data) {
        const challengerName = data.userName || 'Someone';
        const message = `
🎯 ${challengerName} challenged you to beat their score!

📊 ${challengerName}'s Performance Summary:
• Total Quizzes: ${data.totalQuizzes}
• Average Score: ${data.avgScore}%
• Best Score: ${data.bestScore}%
• Tables Mastered: ${data.masteredTables}

Shared on: ${new Date(data.timestamp).toLocaleDateString()}

Can you beat ${challengerName}'s scores? Start a quiz to find out!
        `;
        
        alert(message);
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

// Prevent zoom on double tap for better UX on mobile (but allow button interactions)
document.addEventListener('touchend', function(e) {
    const now = new Date().getTime();
    const timeSince = now - lastTouchEnd;
    
    // Only prevent double-tap zoom if we're not on an interactive element
    if ((timeSince < 300) && (timeSince > 0)) {
        const target = e.target;
        const isInteractive = target.tagName === 'BUTTON' || 
                            target.closest('button') || 
                            target.classList.contains('clickable');
        
        if (!isInteractive) {
            e.preventDefault();
        }
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