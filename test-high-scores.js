const { chromium } = require('playwright');

async function testHighScoresFeature() {
    console.log('Starting Playwright test for multiplication quiz high scores...\n');
    
    const browser = await chromium.launch({ 
        headless: false, // Set to true for headless mode
        slowMo: 500 // Slow down for better observation
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            console.log('❌ Console Error:', msg.text());
        }
    });
    
    // Listen for JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => {
        jsErrors.push(error.message);
        console.log('❌ JavaScript Error:', error.message);
    });
    
    try {
        console.log('1. Navigating to the quiz game...');
        await page.goto('http://localhost:5501');
        
        // Wait for the page to load
        await page.waitForSelector('.difficulty-btn');
        console.log('✅ Page loaded successfully');
        
        console.log('\n2. Clearing existing localStorage to start fresh...');
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        console.log('\n3. Starting a quiz on Easy difficulty...');
        await page.click('[data-difficulty="easy"]');
        
        // Wait for quiz screen to appear
        await page.waitForSelector('#quiz-screen.active');
        console.log('✅ Quiz started successfully');
        
        console.log('\n4. Completing the quiz by answering all questions...');
        
        // Complete the quiz - we'll answer questions (some right, some wrong for a realistic score)
        for (let i = 0; i < 20; i++) {
            await page.waitForSelector('.answer-btn:not([disabled])');
            
            // Get the current question
            const questionText = await page.textContent('#question-text');
            console.log(`   Question ${i + 1}: ${questionText}`);
            
            // For realistic testing, let's get the correct answer and sometimes choose it
            const correctAnswer = await page.evaluate(() => {
                const quiz = window.quiz || 
                    document.querySelector('script[src="script.js"]').__quiz ||
                    window.quizInstance;
                
                if (quiz && quiz.questions && quiz.currentQuestionIndex < quiz.questions.length) {
                    return quiz.questions[quiz.currentQuestionIndex].correctAnswer;
                }
                
                // Fallback: try to calculate from the question text
                const questionElement = document.getElementById('question-text');
                const match = questionElement.textContent.match(/(\d+)\s*×\s*(\d+)/);
                if (match) {
                    return parseInt(match[1]) * parseInt(match[2]);
                }
                return null;
            });
            
            // Choose the correct answer 70% of the time for a good score
            const shouldAnswerCorrectly = Math.random() < 0.7;
            let selectedButtonIndex = 0;
            
            if (shouldAnswerCorrectly && correctAnswer) {
                // Find the button with the correct answer
                const buttons = await page.$$('.answer-btn');
                for (let j = 0; j < buttons.length; j++) {
                    const buttonText = await buttons[j].textContent();
                    if (parseInt(buttonText) === correctAnswer) {
                        selectedButtonIndex = j;
                        break;
                    }
                }
            } else {
                // Choose a random answer
                selectedButtonIndex = Math.floor(Math.random() * 4);
            }
            
            await page.click(`.answer-btn:nth-child(${selectedButtonIndex + 1})`);
            
            // Wait for the feedback to appear and disappear
            await page.waitForSelector('#feedback-overlay:not(.hidden)', { timeout: 5000 });
            await page.waitForSelector('#feedback-overlay.hidden', { timeout: 5000 });
        }
        
        console.log('\n5. Quiz completed, checking results screen...');
        await page.waitForSelector('#results-screen.active');
        
        // Get the final score
        const finalScore = await page.textContent('#final-score');
        const finalTime = await page.textContent('#final-time');
        const finalCorrect = await page.textContent('#final-correct');
        
        console.log(`✅ Results displayed:`);
        console.log(`   Score: ${finalScore}`);
        console.log(`   Time: ${finalTime}`);
        console.log(`   Correct: ${finalCorrect}`);
        
        console.log('\n6. Checking if score was saved to localStorage...');
        const localStorage_scores = await page.evaluate(() => {
            const easyScores = localStorage.getItem('quiz_scores_easy');
            const mediumScores = localStorage.getItem('quiz_scores_medium');
            const hardScores = localStorage.getItem('quiz_scores_hard');
            
            return {
                easy: easyScores ? JSON.parse(easyScores) : null,
                medium: mediumScores ? JSON.parse(mediumScores) : null,
                hard: hardScores ? JSON.parse(hardScores) : null,
                raw: {
                    easy: easyScores,
                    medium: mediumScores,
                    hard: hardScores
                }
            };
        });
        
        console.log('📊 LocalStorage contents:');
        console.log(`   Easy scores: ${localStorage_scores.raw.easy || 'null'}`);
        console.log(`   Medium scores: ${localStorage_scores.raw.medium || 'null'}`);
        console.log(`   Hard scores: ${localStorage_scores.raw.hard || 'null'}`);
        
        if (localStorage_scores.easy && localStorage_scores.easy.length > 0) {
            console.log('✅ Score successfully saved to localStorage');
            console.log('   Easy scores details:', JSON.stringify(localStorage_scores.easy, null, 2));
        } else {
            console.log('❌ No scores found in localStorage for easy difficulty');
        }
        
        console.log('\n7. Navigating to High Scores page...');
        await page.click('#view-scores-btn');
        
        // Wait for high scores screen
        await page.waitForSelector('#high-scores-screen.active');
        console.log('✅ High Scores page loaded');
        
        console.log('\n8. Checking if scores are displayed on High Scores page...');
        
        // Check if the easy tab is active and has scores
        const easyScoresContainer = await page.$('#easy-scores.active');
        const hasNoScoresMessage = await page.$('#easy-scores .no-scores');
        const hasScoreEntries = await page.$$('#easy-scores .score-entry');
        
        console.log(`   Easy scores container active: ${!!easyScoresContainer}`);
        console.log(`   "No scores" message present: ${!!hasNoScoresMessage}`);
        console.log(`   Number of score entries displayed: ${hasScoreEntries.length}`);
        
        if (hasScoreEntries.length > 0) {
            console.log('✅ High scores are being displayed correctly');
            
            // Get the displayed score details
            for (let i = 0; i < hasScoreEntries.length; i++) {
                const rank = await hasScoreEntries[i].$eval('.score-rank', el => el.textContent);
                const percentage = await hasScoreEntries[i].$eval('.score-percentage', el => el.textContent);
                const details = await hasScoreEntries[i].$eval('.score-time', el => el.textContent);
                console.log(`   ${rank}: ${percentage} (${details})`);
            }
        } else if (hasNoScoresMessage) {
            console.log('❌ High scores page shows "No scores" message despite having scores in localStorage');
        }
        
        console.log('\n9. Testing other difficulty tabs...');
        
        // Test medium tab
        await page.click('[data-tab="medium"]');
        await page.waitForTimeout(500);
        const mediumActive = await page.$('#medium-scores.active');
        console.log(`   Medium tab activated: ${!!mediumActive}`);
        
        // Test hard tab
        await page.click('[data-tab="hard"]');
        await page.waitForTimeout(500);
        const hardActive = await page.$('#hard-scores.active');
        console.log(`   Hard tab activated: ${!!hardActive}`);
        
        console.log('\n10. Testing another quiz to see multiple scores...');
        
        // Go back to start and play another round
        await page.click('#back-to-menu-btn');
        await page.waitForSelector('#start-screen.active');
        
        // Start another quiz
        await page.click('[data-difficulty="easy"]');
        await page.waitForSelector('#quiz-screen.active');
        
        // Quickly complete this quiz (just click first answer each time)
        for (let i = 0; i < 20; i++) {
            await page.waitForSelector('.answer-btn:not([disabled])');
            await page.click('.answer-btn:first-child');
            await page.waitForSelector('#feedback-overlay:not(.hidden)', { timeout: 3000 });
            await page.waitForSelector('#feedback-overlay.hidden', { timeout: 3000 });
        }
        
        // Check results
        await page.waitForSelector('#results-screen.active');
        const secondScore = await page.textContent('#final-score');
        console.log(`   Second quiz score: ${secondScore}`);
        
        // Go to high scores again
        await page.click('#view-scores-btn');
        await page.waitForSelector('#high-scores-screen.active');
        
        const secondRoundScores = await page.$$('#easy-scores .score-entry');
        console.log(`   Total score entries after second quiz: ${secondRoundScores.length}`);
        
        if (secondRoundScores.length === 2) {
            console.log('✅ Multiple scores are being saved and displayed correctly');
        } else if (secondRoundScores.length === 1) {
            console.log('⚠️  Only one score showing - check if scores are being properly accumulated');
        } else {
            console.log('❌ Unexpected number of scores displayed');
        }
        
        console.log('\n11. Final localStorage check...');
        const finalLocalStorage = await page.evaluate(() => {
            const easyScores = localStorage.getItem('quiz_scores_easy');
            return easyScores ? JSON.parse(easyScores) : null;
        });
        
        console.log(`   Final easy scores count: ${finalLocalStorage ? finalLocalStorage.length : 0}`);
        if (finalLocalStorage && finalLocalStorage.length > 0) {
            console.log('   Final scores data:', JSON.stringify(finalLocalStorage, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (consoleErrors.length > 0) {
        console.log(`❌ Console Errors Found (${consoleErrors.length}):`);
        consoleErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    } else {
        console.log('✅ No console errors detected');
    }
    
    if (jsErrors.length > 0) {
        console.log(`❌ JavaScript Errors Found (${jsErrors.length}):`);
        jsErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    } else {
        console.log('✅ No JavaScript errors detected');
    }
    
    console.log('\nTest completed. Please check the console output above for detailed results.');
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
    await browser.close();
}

// Run the test
testHighScoresFeature().catch(console.error);