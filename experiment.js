// Initialisiere jsPsych
const jsPsych = initJsPsych({
    on_finish: function() {
        jsPsych.data.get().localSave('csv', 'contextual_cueing_data.csv');
    }
});

// =========================================================================
// ## 1. EXPERIMENT-PARAMETER
// =========================================================================

const PARAMS = {
    num_blocks: 20,
    trials_per_block: 10,
    num_old_configs: 5,
    set_size: 12,
    
    target_char: 'T',
    distractor_char: 'L',
    
    grid_rows: 8,
    grid_cols: 8,
    cell_size: 75, // Perfekte Größe für alle Bildschirme (kein Scrollen)
    font_size: 50, // Groß, aber mit genug Abstand zum Rand der Zelle
    
    fixation_duration: 500,
    feedback_duration: 400,
    iti: 1000,
    
    left_key: 'f',
    right_key: 'j'
};

// =========================================================================
// ## 2. STIMULUS-KONFIGURATIONEN ERSTELLEN
// =========================================================================

function generate_config() {
    const target_rotation = jsPsych.randomization.sampleWithoutReplacement([90, 270], 1)[0];
    
    let all_positions = [];
    for (let row = 0; row < PARAMS.grid_rows; row++) {
        for (let col = 0; col < PARAMS.grid_cols; col++) {
            all_positions.push([row, col]);
        }
    }

    const shuffled_positions = jsPsych.randomization.shuffle(all_positions);
    const selected_grid_positions = shuffled_positions.slice(0, PARAMS.set_size);

    const container_width = PARAMS.grid_cols * PARAMS.cell_size;
    const container_height = PARAMS.grid_rows * PARAMS.cell_size;
    
    const pixel_positions = selected_grid_positions.map(pos => {
        const x = pos[1] * PARAMS.cell_size - container_width / 2 + PARAMS.cell_size / 2;
        const y = pos[0] * PARAMS.cell_size - container_height / 2 + PARAMS.cell_size / 2;
        return [x, y];
    });

    return {
        positions: pixel_positions,
        target_rotation: target_rotation,
        distractor_rotations: Array.from({ length: PARAMS.set_size - 1 }, () => jsPsych.randomization.sampleWithoutReplacement([0, 90, 180, 270], 1)[0])
    };
}

const old_configs = [];
for (let i = 0; i < PARAMS.num_old_configs; i++) {
    old_configs.push(generate_config());
}

// =========================================================================
// ## 3. ZEITSTRAHL (TIMELINE) DES EXPERIMENTS
// =========================================================================
const timeline = [];

// Vollbildmodus starten (Verhindert Ablenkungen und garantiert Platz)
timeline.push({
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    fullscreen_message: '<p>Das Experiment wird in den Vollbildmodus wechseln, wenn Sie auf den Knopf klicken.</p>',
    button_label: 'Weiter'
});

timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<h1>Willkommen zum visuellen Suchexperiment</h1>
               <p>Ihre Aufgabe ist es, in jeder Anzeige den Buchstaben 'T' zu finden.</p>
               <p>Geben Sie so schnell und genau wie moeglich an, in welche Richtung der senkrechte Strich des 'T' zeigt.</p>
               <br>
               <p>Druecken Sie die Taste <strong>'${PARAMS.left_key.toUpperCase()}'</strong>, wenn der Strich nach <strong>links</strong> zeigt.</p>
               <p>Druecken Sie die Taste <strong>'${PARAMS.right_key.toUpperCase()}'</strong>, wenn der Strich nach <strong>rechts</strong> zeigt.</p>
               <br>
               <p>Legen Sie Ihre Zeigefinger auf die Tasten 'F' und 'J'.</p>
               <p>Druecken Sie eine beliebige Taste, um zu beginnen.</p>`
});

// Hauptschleife über alle Blöcke
for (let block_num = 0; block_num < PARAMS.num_blocks; block_num++) {
    
    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<p>Block ${block_num + 1} von ${PARAMS.num_blocks}</p>
                   <p>Druecken Sie die Leertaste, um eine kurze Pause zu beenden und den Block zu starten.</p>`,
        choices: [' ']
    });
    
    const block_trials = [];
    for (let i = 0; i < PARAMS.num_old_configs; i++) {
        block_trials.push({ type: 'old', config: old_configs[i], config_id: i });
    }
    for (let i = 0; i < (PARAMS.trials_per_block - PARAMS.num_old_configs); i++) {
        block_trials.push({ type: 'new', config: generate_config(), config_id: -1 });
    }

    const randomized_block_trials = jsPsych.randomization.shuffle(block_trials);

    randomized_block_trials.forEach(trial_info => {
        
        timeline.push({
            type: jsPsychHtmlKeyboardResponse,
            stimulus: '<div style="font-size: 90px;">+</div>',
            choices: "NO_KEYS",
            trial_duration: PARAMS.fixation_duration
        });

        const search_trial = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                const config = trial_info.config;
                const total_width = PARAMS.grid_cols * PARAMS.cell_size;
                const total_height = PARAMS.grid_rows * PARAMS.cell_size;
                
                // Haupt-Container: Zentriert und genau in der Größe des Rasters
                let html = `<div class="search-container" style="position: relative; width: ${total_width}px; height: ${total_height}px; margin: 0 auto;">`;
                
                // Hilfsfunktion: Zentriert die Buchstaben exakt in ihrer Zelle, verhindert Überschneidungen
                const get_style = (x, y, rotation) => {
                    return `position: absolute; left: 50%; top: 50%; 
                            width: ${PARAMS.cell_size}px; height: ${PARAMS.cell_size}px; 
                            margin-left: -${PARAMS.cell_size / 2}px; margin-top: -${PARAMS.cell_size / 2}px; 
                            display: flex; justify-content: center; align-items: center; 
                            font-size: ${PARAMS.font_size}px; font-weight: bold; line-height: 1; 
                            transform: translate(${x}px, ${y}px) rotate(${rotation}deg);`;
                };

                // Zielreiz (T) einfügen
                let target_style = get_style(config.positions[0][0], config.positions[0][1], config.target_rotation);
                html += `<div style="${target_style}">${PARAMS.target_char}</div>`;
                
                // Ablenker (L) einfügen
                for (let i = 1; i < PARAMS.set_size; i++) {
                    let distractor_style = get_style(config.positions[i][0], config.positions[i][1], config.distractor_rotations[i-1]);
                    html += `<div style="${distractor_style}">${PARAMS.distractor_char}</div>`;
                }
                
                html += '</div>';
                return html;
            },
            choices: [PARAMS.left_key, PARAMS.right_key],
            data: {
                task: 'search',
                trial_type: trial_info.type,
                config_id: trial_info.config_id,
                block_number: block_num + 1,
                correct_response: trial_info.config.target_rotation === 90 ? PARAMS.left_key : PARAMS.right_key
            },
            on_finish: function(data){
                data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
            }
        };
        timeline.push(search_trial);
        
        timeline.push({
            type: jsPsychHtmlKeyboardResponse,
            stimulus: function() {
                const last_trial = jsPsych.data.get().last(1).values()[0];
                if(last_trial.correct){
                    return '<p style="color: lightgreen; font-size: 40px; font-weight: bold;">Korrekt</p>';
                } else {
                    return '<p style="color: red; font-size: 40px; font-weight: bold;">Falsch</p>';
                }
            },
            choices: "NO_KEYS",
            trial_duration: PARAMS.feedback_duration
        });

        timeline.push({
            type: jsPsychHtmlKeyboardResponse,
            stimulus: '',
            choices: "NO_KEYS",
            trial_duration: PARAMS.iti
        });
    });
}

// ✨ Änderung: Das Experiment beendet sich nach 3 Sekunden automatisch und löst den Download aus!
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<h1>Experiment beendet</h1>
               <p>Vielen Dank für Ihre Teilnahme!</p>
               <p>Die Datendatei wird nun automatisch heruntergeladen.</p>`,
    choices: "NO_KEYS",
    trial_duration: 3000 
});

jsPsych.run(timeline);