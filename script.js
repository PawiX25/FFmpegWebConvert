const { FFmpeg } = FFmpegWASM;
const ffmpeg = new FFmpeg();

let isFFmpegLoaded = false;

async function loadFFmpeg() {
    if (!isFFmpegLoaded) {
        await ffmpeg.load({
            coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.wasm', 'application/wasm'),
        });
        isFFmpegLoaded = true;
    }
}

async function toBlobURL(url, type) {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

async function convertVideo() {
    const statusElement = document.getElementById('status');
    const progressElement = document.getElementById('progress');
    const resultElement = document.getElementById('result');
    const videoFile = document.getElementById('videoInput').files[0];
    const targetFormat = document.getElementById('formatSelect').value;
    const quality = document.getElementById('qualitySelect').value;
    const audioOption = document.getElementById('audioSelect').value;
    const resolution = document.getElementById('resolutionSelect').value;

    if (!videoFile) {
        alert('Please select a video file');
        return;
    }

    try {
        if (!isFFmpegLoaded) {
            statusElement.textContent = 'Loading FFmpeg...';
            await loadFFmpeg();
        }

        statusElement.textContent = 'Starting conversion...';
        const inputFileName = 'input_video';
        const outputFileName = `output.${targetFormat}`;

        ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoFile));

        ffmpeg.setProgress(({ ratio }) => {
            progressElement.style.width = `${ratio * 100}%`;
        });

        // Build FFmpeg command arguments
        const args = ['-i', inputFileName];

        // Handle audio options
        if (audioOption === 'mute') {
            args.push('-an');
        } else if (audioOption === 'reduce') {
            args.push('-filter:a', 'volume=0.5');
        }

        // Handle quality
        if (quality === 'high') {
            args.push('-crf', '18');
        } else if (quality === 'medium') {
            args.push('-crf', '23');
        } else if (quality === 'low') {
            args.push('-crf', '28');
        }

        // Handle resolution
        if (resolution !== 'original') {
            args.push('-vf', `scale=-1:${resolution}`);
        }

        // Add output file
        args.push(outputFileName);

        // Run conversion
        await ffmpeg.run(...args);

        const data = ffmpeg.FS('readFile', outputFileName);
        const url = URL.createObjectURL(new Blob([data.buffer], { type: `video/${targetFormat}` }));
        
        resultElement.innerHTML = `
            <div class="text-center">
                <p class="text-green-600 font-bold mb-4">Conversion complete!</p>
                <a href="${url}" download="${outputFileName}" 
                   class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-block">
                    Download converted video
                </a>
            </div>
        `;

        ffmpeg.FS('unlink', inputFileName);
        ffmpeg.FS('unlink', outputFileName);

    } catch (error) {
        console.error(error);
        statusElement.textContent = 'Error during conversion: ' + error.message;
    }
}

document.getElementById('convertBtn').addEventListener('click', convertVideo);
