// Version on code: v15.11 (Update for the console logs)
// Made for Google Search Console
// Created by B-HDtm

const { useState, useEffect, useRef } = React;

function BlockchainTerminal() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  console.log('Debug: isMobile ->', isMobile);

  const [output, setOutput] = useState(["> start terminal.js"]);
  const [command, setCommand] = useState('');
  const [blockchain, setBlockchain] = useState([]);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const [isMining, setIsMining] = useState(false);
  const miningAbortRef = useRef(false);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [loadingStage, setLoadingStage] = useState(0);
  const [progress, setProgress] = useState([0, 0, 0]);
  const [showTerminal, setShowTerminal] = useState(false);

  const [stageDurations] = useState(() => [
    3000,
    500 + Math.random() * 9500,
    500 + Math.random() * 9500,
  ]);

  useEffect(() => {
    console.log('Debug: stageDurations ->', stageDurations);
  }, []);

  useEffect(() => {
    console.log('Debug: output updated, scrolling terminal');
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [output]);

  useEffect(() => {
    console.log('Debug: mounting terminal, restoring blockchain from localStorage');
    const saved = localStorage.getItem('blockchain_json');
    if (saved) {
      setBlockchain(JSON.parse(saved));
      console.log('Debug: blockchain loaded from localStorage', JSON.parse(saved));
    }

    const focusInput = () => {
      inputRef.current?.focus();
      console.log('Debug: input focused');
    };

    document.addEventListener('mousedown', focusInput);
    document.addEventListener('keydown', focusInput);
    document.addEventListener('touchstart', focusInput);

    const handleCtrlC = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        console.log('Debug: Ctrl+C pressed');
        if (isMining) {
          console.log('Debug: aborting mining due to Ctrl+C');
          miningAbortRef.current = true;
          setIsMining(false);
          setOutput((prev) => [...prev, '\n⛔ Mining aborted by user.']);
        }
      }
    };

    document.addEventListener('keydown', handleCtrlC);

    if (isMobile) {
      let touchStartX = 0;
      document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        console.log('Debug: touchstart X ->', touchStartX);
      });
      document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        console.log('Debug: touchend X ->', touchEndX);
        if (Math.abs(touchEndX - touchStartX) > 80) {
          console.log('Debug: back gesture detected');
          if (isMining) {
            console.log('Debug: aborting mining due to back gesture');
            miningAbortRef.current = true;
            setIsMining(false);
            setOutput((prev) => [...prev, '\n⛔ Mining aborted (Back gesture).']);
          }
        }
      });
    }

    return () => {
      console.log('Debug: cleaning up event listeners');
      document.removeEventListener('mousedown', focusInput);
      document.removeEventListener('keydown', focusInput);
      document.removeEventListener('touchstart', focusInput);
      document.removeEventListener('keydown', handleCtrlC);
    };
  }, [isMining]);

  const appendOutput = (line, replaceLast = false) => {
    console.log('Debug: appendOutput ->', line, 'replaceLast?', replaceLast);
    setOutput((prev) =>
      replaceLast ? [...prev.slice(0, -1), line] : [...prev, line]
    );
  };

  const appendPre = (text) => {
    console.log('Debug: appendPre ->', text);
    setOutput((prev) => [...prev, { pre: text }]);
  };

  const animateProgressStage = (stageIndex, duration, callback) => {
    console.log(`Debug: animateProgressStage start: stageIndex=${stageIndex}, duration=${duration}ms`);
    const start = performance.now();
    const step = (time) => {
      const elapsed = time - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress((prev) => {
        const newProgress = [...prev];
        newProgress[stageIndex] = pct.toFixed(0);
        return newProgress;
      });
      if (pct < 100) requestAnimationFrame(step);
      else {
        console.log(`Debug: animateProgressStage complete: stageIndex=${stageIndex}`);
        callback?.();
      }
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    console.log('Debug: loadingStage ->', loadingStage);
    if (loadingStage === 0) {
      setOutput(["> start terminal.js"]);
      setTimeout(() => setLoadingStage(1), 500);
    } else if (loadingStage === 1) {
      animateProgressStage(0, stageDurations[0], () => setLoadingStage(2));
    } else if (loadingStage === 2) {
      animateProgressStage(1, stageDurations[1], () => setLoadingStage(3));
    } else if (loadingStage === 3) {
      animateProgressStage(2, stageDurations[2], () => setLoadingStage(4));
    } else if (loadingStage === 4) {
      setShowTerminal(true);
      setOutput([
        'NeXT Online Terminal - Check the blockchain now',
        'First, type the command "help"',
        isMobile
          ? 'Tap (Back) to stop a running process'
          : 'Press Ctrl+C to stop a running process',
      ]);
      console.log('Debug: terminal ready, showTerminal=true');
    }
  }, [loadingStage]);

  const loadChain = () => {
    console.log('Debug: loadChain called');
    const chain = JSON.parse(localStorage.getItem('blockchain_json') || '[]');
    console.log('Debug: loaded chain ->', chain);
    return chain;
  };

  const saveChain = (chain) => {
    console.log('Debug: saveChain called ->', chain);
    localStorage.setItem('blockchain_json', JSON.stringify(chain, null, 2));
    setBlockchain(chain);
  };

  const sha256 = async (message) => {
    console.log('Debug: sha256 called ->', message);
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    console.log('Debug: sha256 result ->', hash);
    return hash;
  };

  const mineBlock = async (index, data, previousHash, difficulty = 2) => {
    console.log('Debug: mineBlock start', { index, data, previousHash, difficulty });
    let nonce = 0;
    let timestamp = new Date().toISOString();
    let hash = await sha256(index + previousHash + timestamp + JSON.stringify(data) + nonce);
    const target = '0'.repeat(difficulty);
    while (hash.substring(0, difficulty) !== target) {
      if (miningAbortRef.current) {
        console.log('Debug: mining aborted');
        return null;
      }
      nonce++;
      hash = await sha256(index + previousHash + timestamp + JSON.stringify(data) + nonce);
    }
    console.log('Debug: mineBlock complete ->', { index, hash, nonce });
    return { index, timestamp, data, previousHash, hash, nonce };
  };

  const runPipeline = async (silent = false) => {
    console.log('Debug: runPipeline called, silent=', silent);
    let chain = loadChain();

    const add = async (lang, file, amount) => {
      console.log('Debug: add block ->', { lang, file, amount });
      const previousHash = chain.length ? chain[chain.length - 1].hash : '0';
      const blk = await mineBlock(chain.length, { lang, file, amount }, previousHash);
      if (!blk) return;
      chain.push(blk);
      if (!silent)
        appendOutput(`NXT ⥉ ${lang.toUpperCase()} ${file || 'Script'}: Block ${blk.index} mined: ${blk.hash}${amount !== undefined ? ` | Amount: ${amount}` : ''}`);
      return blk;
    };

    // блоки для разных языков
    if (!silent) {
      appendOutput('=== Running C++ programs ===');
      await add('C++', 'Hasher.cpp', 100);
      await add('C++', 'Hasher2.cpp', 150);

      appendOutput('=== Running PHP scripts ===');
      await add('PHP', 'send.php', 300);
      await add('PHP', 'notify.php', 367);

      appendOutput('=== Running Java programs ===');
      await add('Java', 'Logger', 200);
      await add('Java', 'Notifier', 500);

      appendOutput('=== Running JS scripts ===');
      await add('JS', null, 0);
      await add('JS', null, 0);
      await add('JS', null, 313);
      await add('JS', null, 445);
      await add('JS', null, 200);
      await add('JS', null, 500);
    } else {
      await add('C++', 'Hasher.cpp', 100);
      await add('C++', 'Hasher2.cpp', 150);
      await add('PHP', 'send.php', 300);
      await add('PHP', 'notify.php', 367);
      await add('Java', 'Logger', 200);
      await add('Java', 'Notifier', 500);
      await add('JS', null, 0);
      await add('JS', null, 0);
      await add('JS', null, 313);
      await add('JS', null, 445);
      await add('JS', null, 200);
      await add('JS', null, 500);
    }

    saveChain(chain);
    if (!silent)
      appendOutput('✅ Blockchain updated and saved to block/blockchain.json');
    console.log('Debug: runPipeline complete');
  };

  const runCommand = async (cmd) => {
    console.log('Debug: runCommand ->', cmd);
    const args = cmd.trim().split(/\s+/).filter(Boolean);
    const main = (args[0] || '').toLowerCase();
    console.log('Debug: command parsed ->', main, 'args ->', args);

    switch (main) {
      case 'help': {
        appendOutput('Commands:\nhelp - show this help\nstart - run blockchain pipeline\nstart -m N - run blockchain pipeline N times (progress bar)\nblock - print blockchain.json (pretty)\nblock -delete - delete blockchain.json\nblock -download - download blockchain.json from server\ninfo - show blockchain stats\nter - about NeXT Online Terminal\nclear - clear screen');
        break;
      }
      case 'ter': {
        appendOutput("NeXT Online Terminal\nThis is an interactive terminal for working with an experimental blockchain model.\nYou can execute commands (help, start, block, info) and see the result in real time.\nThe idea of the terminal is to show the principles of blockchain and its verification in real time.\n\nℹ For more information: https://github.com/B-HDtm/NeXT/blob/main/README.md");
        break;
      }
      case 'clear': {
        console.log('Debug: clear command executed');
        setOutput([]);
        break;
      }
      case 'start': {
        console.log('Debug: start command executed');
        if (args[1] === '-m' && !isNaN(parseInt(args[2]))) {
          const times = parseInt(args[2]);
          setIsMining(true);
          miningAbortRef.current = false;
          console.log('Debug: start mining', times, 'times');

          const barLength = window.innerWidth < 768 ? 30 : 70;
          appendOutput(`Running blockchain (${times} times)...`);
          appendOutput('0% [' + '-'.repeat(barLength) + ']');

          for (let i = 0; i < times; i++) {
            if (miningAbortRef.current) break;
            await runPipeline(true);

            const percent = Math.floor(((i + 1) / times) * 100);
            const filledCount = Math.floor((percent / 100) * barLength);
            const filled = '='.repeat(filledCount);
            const empty = '-'.repeat(barLength - filledCount);

            appendOutput(`${percent}% [${filled}${empty}]`, true);
          }

          if (!miningAbortRef.current) {
            appendOutput('✅ All runs completed.');
          } else {
            appendOutput('\n⛔ Mining aborted by user.');
          }

          setIsMining(false);
          console.log('Debug: mining finished');
        } else {
          await runPipeline(false);
        }
        break;
      }
      case 'block': {
        console.log('Debug: block command', args[1]);
        if (args[1] === '-delete') {
          if (!localStorage.getItem('blockchain_json')) {
            appendOutput('Error: blockchain.json does not exist. Run start to create it.');
          } else {
            localStorage.removeItem('blockchain_json');
            setBlockchain([]);
            appendOutput('Blockchain deleted successfully.');
          }
        } else if (args[1] === '-download') {
          const raw = localStorage.getItem('blockchain_json');
          if (!raw) {
            appendOutput('Error: blockchain.json does not exist. Run start to create it.');
          } else {
            appendOutput('Checking blockchain data...');
            await new Promise((r) => setTimeout(r, 500));
            appendOutput('Initializing export module...');
            await new Promise((r) => setTimeout(r, 500));
            appendOutput('Packaging blockchain.json...');
            await new Promise((r) => setTimeout(r, 500));
            appendOutput('✅ Blockchain ready. Download will start shortly...');

            const blob = new Blob([raw], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'blockchain.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        } else {
          const raw = localStorage.getItem('blockchain_json');
          if (!raw) {
            appendOutput('Error: blockchain.json does not exist. Run start to create it.');
          } else {
            appendPre(JSON.stringify(JSON.parse(raw), null, 2));
          }
        }
        break;
      }
      case 'info': {
        console.log('Debug: info command executed');
        const chain = loadChain();
        if (chain.length === 0) {
          appendOutput('Error: blockchain.json does not exist. Run start to create it.');
        } else {
          const last = chain[chain.length - 1];
          const totalAmount = chain.reduce((s, b) => s + (typeof b.data?.amount === 'number' ? b.data.amount : 0), 0);
          appendOutput('Blockchain info:');
          appendOutput(`Blocks: ${chain.length}`);
          appendOutput(`Latest index: ${last.index}`);
          appendOutput(`Latest hash: ${last.hash}`);
          appendOutput(`Total amount: ${totalAmount} ⥉`);
          appendOutput('Storage key: blockchain_json');
        }
        break;
      }
      default: {
        if (main) {
          appendOutput(`Unknown command: ${main}, try "help"`);
          console.log('Debug: unknown command ->', main);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    console.log('Debug: handleKeyDown ->', e.key);
    if (isMining && !(e.ctrlKey && e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      console.log('Debug: key ignored during mining ->', e.key);
      return;
    }

    if (e.key === 'Enter') {
      appendOutput(`> ${command}`);
      if (command.trim()) {
        setHistory((prev) => [...prev, command]);
        setHistoryIndex(-1);
        console.log('Debug: command added to history ->', command);
      }
      runCommand(command);
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
        console.log('Debug: history navigate up ->', newIndex);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex < history.length) {
          setHistoryIndex(newIndex);
          setCommand(history[newIndex]);
        } else {
          setHistoryIndex(-1);
          setCommand('');
        }
        console.log('Debug: history navigate down ->', newIndex);
      }
      e.preventDefault();
    }
  };

  return !showTerminal ? (
    <div className="w-screen h-screen bg-black text-green-500 font-mono p-4 flex flex-col justify-center items-center">
      {output.map((line, i) =>
        typeof line === 'string' ? (
          <div key={i} className="whitespace-pre-wrap break-words">{line}</div>
        ) : (
          <pre key={i} className="whitespace-pre-wrap break-words">{line.pre}</pre>
        )
      )}
      <div className="mt-4 w-80 flex flex-col gap-2">
        {progress.map((p, i) => (
          <div key={i} className="w-full bg-green-900 h-4 relative">
            <span className="absolute left-0 text-green-300 text-xs">{p}%</span>
            <div
              className="bg-green-500 h-4 transition-all duration-100"
              style={{ width: `${p}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div
      className={`w-screen h-screen bg-black text-green-500 font-mono p-4 overflow-y-auto select-text ${isMobile ? 'text-sm' : ''}`}
      ref={terminalRef}
      onClick={() => inputRef.current?.focus()}
    >
      {output.map((line, i) =>
        typeof line === 'string' ? (
          <div key={i} className="whitespace-pre-wrap break-words">{line}</div>
        ) : (
          <pre key={i} className="whitespace-pre-wrap break-words">{line.pre}</pre>
        )
      )}
      <div className="mt-1 flex items-center gap-2">
        <span>&gt;</span>
        <input
          ref={inputRef}
          className={`bg-black text-green-500 outline-none ${isMobile ? 'w-[95%] text-sm' : 'w-[80ch]'}`}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isMining || !showTerminal}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BlockchainTerminal />
);
