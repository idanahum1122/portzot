// Subtopic page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    setupSubtopicQuestionnaire();
    loadSubtopicData();
});

// Get current subtopic number from URL
function getCurrentSubtopic() {
    const path = window.location.pathname;
    const match = path.match(/domain1-sub(\d+)\.html/);
    return match ? match[1] : null;
}

// Load saved subtopic data
function loadSubtopicData() {
    const subNum = getCurrentSubtopic();
    if (!subNum) return;
    
    const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
    const domain1Data = progress.domain1 || {};
    const subtopicData = domain1Data.subtopics ? domain1Data.subtopics[`sub${subNum}`] : null;
    
    if (subtopicData && subtopicData.answers) {
        const form = document.getElementById('subQuestionnaire') || document.getElementById(`sub${subNum}Questionnaire`);
        if (form) {
            Object.keys(subtopicData.answers).forEach(key => {
                const input = form.querySelector(`input[name="${key}"][value="${subtopicData.answers[key]}"]`);
                if (input) input.checked = true;
            });
            
            // Show previous result
            if (subtopicData.score) {
                showSubtopicResult(subtopicData.score);
            }
        }
    }
}

// Setup questionnaire
function setupSubtopicQuestionnaire() {
    const forms = [
        document.getElementById('subQuestionnaire'),
        document.getElementById('sub1Questionnaire'),
        document.getElementById('sub2Questionnaire')
    ].filter(f => f);
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const subNum = getCurrentSubtopic();
            if (!subNum) return;
            
            // Calculate score
            let total = 0;
            const answers = {};
            
            for (let i = 1; i <= 5; i++) {
                const input = form.querySelector(`input[name="sq${i}"]:checked`);
                if (input) {
                    const value = parseInt(input.value);
                    total += value;
                    answers[`sq${i}`] = value.toString();
                }
            }
            
            // Save to localStorage
            const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
            if (!progress.domain1) progress.domain1 = {};
            if (!progress.domain1.subtopics) progress.domain1.subtopics = {};
            
            progress.domain1.subtopics[`sub${subNum}`] = {
                score: total,
                answers: answers,
                completedAt: new Date().toISOString()
            };
            
            localStorage.setItem('domainProgress', JSON.stringify(progress));
            
            // Show result
            showSubtopicResult(total);
            
            // Scroll to result
            const resultBox = document.getElementById('subQuestionnaireResult');
            if (resultBox) {
                resultBox.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Show subtopic result
function showSubtopicResult(score) {
    const resultBox = document.getElementById('subQuestionnaireResult');
    const scoreValue = document.getElementById('subScoreValue');
    const resultText = document.getElementById('subResultText');
    
    if (!resultBox) return;
    
    scoreValue.textContent = score;
    
    let text = '';
    if (score >= 20) {
        text = '🌟 חיבור מצוין! תת-תחום זה נראה מתאים לך במיוחד!';
    } else if (score >= 15) {
        text = '💚 חיבור טוב! יש כאן פוטנציאל מעניין.';
    } else if (score >= 10) {
        text = '💛 חיבור בינוני. אולי תתי-תחומים אחרים יתאימו לך יותר.';
    } else {
        text = '💙 נראה שיש תתי-תחומים אחרים שמתאימים לך יותר.';
    }
    
    if (resultText) {
        resultText.textContent = text;
    }
    resultBox.style.display = 'block';
}

// Compare subtopics (optional feature)
function compareSubtopics() {
    const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
    const domain1Data = progress.domain1 || {};
    const subtopics = domain1Data.subtopics || {};
    
    const scores = Object.keys(subtopics).map(key => ({
        name: key,
        score: subtopics[key].score
    })).sort((a, b) => b.score - a.score);
    
    return scores;
}
