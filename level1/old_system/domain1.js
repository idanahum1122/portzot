// Domain 1 page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    markDomainAsStarted();
    loadDomain1Data();
    setupQuestionnaire();
});

// Mark domain as started
function markDomainAsStarted() {
    const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
    if (!progress.domain1) {
        progress.domain1 = {
            started: true,
            startedAt: new Date().toISOString()
        };
        localStorage.setItem('domainProgress', JSON.stringify(progress));
    }
}

// Load saved data
function loadDomain1Data() {
    const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
    const domain1Data = progress.domain1 || {};
    
    // Load questionnaire answers
    if (domain1Data.answers) {
        const form = document.getElementById('domain1Questionnaire');
        if (form) {
            Object.keys(domain1Data.answers).forEach(key => {
                const input = form.querySelector(`input[name="${key}"][value="${domain1Data.answers[key]}"]`);
                if (input) input.checked = true;
            });
        }
    }
    
    // Show previous result
    if (domain1Data.mainScore) {
        showResult(domain1Data.mainScore);
    }
}

// Setup questionnaire
function setupQuestionnaire() {
    const form = document.getElementById('domain1Questionnaire');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Calculate score
        let total = 0;
        for (let i = 1; i <= 5; i++) {
            const value = parseInt(form.querySelector(`input[name="q${i}"]:checked`).value);
            total += value;
        }
        
        // Save answers
        const answers = {};
        for (let i = 1; i <= 5; i++) {
            answers[`q${i}`] = form.querySelector(`input[name="q${i}"]:checked`).value;
        }
        
        // Update progress
        const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
        progress.domain1 = {
            ...progress.domain1,
            mainScore: total,
            answers: answers,
            completed: true,
            completedAt: new Date().toISOString()
        };
        localStorage.setItem('domainProgress', JSON.stringify(progress));
        
        // Show result
        showResult(total);
        
        // Scroll to result
        document.getElementById('questionnaireResult').scrollIntoView({ behavior: 'smooth' });
    });
}

// Show result
function showResult(score) {
    const resultBox = document.getElementById('questionnaireResult');
    const scoreValue = document.getElementById('scoreValue');
    const resultText = document.getElementById('resultText');
    
    if (!resultBox) return;
    
    scoreValue.textContent = score;
    
    let text = '';
    if (score >= 20) {
        text = '🌟 חיבור חזק מאוד! נראה שתחום זה מתאים לך במיוחד. המשיכי לחקור את תתי-התחומים כדי למצוא את הכיוון המדויק ביותר עבורך.';
    } else if (score >= 15) {
        text = '💚 חיבור טוב! יש כאן פוטנציאל. כדאי לחקור את תתי-התחומים כדי לראות מה מדבר אליך יותר.';
    } else if (score >= 10) {
        text = '💛 חיבור בינוני. אולי חלק מתתי-התחומים יעניין אותך יותר מאחרים. כדאי לחקור ולגלות.';
    } else {
        text = '💙 נראה שיש תחומים אחרים שמתאימים לך יותר. זה בסדר גמור! המשיכי לחקור תחומים נוספים.';
    }
    
    resultText.textContent = text;
    resultBox.style.display = 'block';
}
