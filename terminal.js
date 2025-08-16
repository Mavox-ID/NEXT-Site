const { useState, useEffect, useRef } = React;

function BlockchainTerminal() {
  const [output, setOutput] = useState([
    'NeXT Online Terminal - Check the blockchain now',
    'First, type the command "help"',
    'Press Ctrl+C to stop a running process'
  ]);
  const [command, setCommand] = useState('');
  const [blockchain, setBlockchain] = useState([]);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const [isMining, setIsMining] = useState(false);
  const miningAbortRef = useRef(false);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [output]);

  useEffect(() => {
    const saved = localStorage.getItem('blockchain_json');
    if (saved) setBlockchain(JSON.parse(saved));

    const focusInput = () => inputRef.current?.focus();
    document.addEventListener('mousedown', focusInput);
    document.addEventListener('keydown', focusInput);
    document.addEventListener('touchstart', focusInput);

    const handleCtrlC = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        if (isMining) {
          miningAbortRef.current = true;
          setIsMining(false);
          setOutput((prev) => [...prev, '\n⛔ Mining aborted by user.']);
        }
      }
    };
    document.addEventListener('keydown', handleCtrlC);

    return () => {
      document.removeEventListener('mousedown', focusInput);
      document.removeEventListener('keydown', focusInput);
      document.removeEventListener('touchstart', focusInput);
      document.removeEventListener('keydown', handleCtrlC);
    };
  }, [isMining]);

  const appendOutput = (line, replaceLast = false) => {
    setOutput((prev) => replaceLast ? [...prev.slice(0, -1), line] : [...prev, line]);
  };
  const appendPre = (text) => setOutput((prev) => [...prev, { pre: text }]);

  const loadChain = () => JSON.parse(localStorage.getItem('blockchain_json') || '[]');
  const saveChain = (chain) => {
    localStorage.setItem('blockchain_json', JSON.stringify(chain, null, 2));
    setBlockchain(chain);
  };

  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const mineBlock = async (index, data, previousHash, difficulty = 2) => {
    let nonce = 0;
    let timestamp = new Date().toISOString();
    let hash = await sha256(index + previousHash + timestamp + JSON.stringify(data) + nonce);
    const target = '0'.repeat(difficulty);
    while (hash.substring(0, difficulty) !== target) {
      if (miningAbortRef.current) return null;
      nonce++;
      hash = await sha256(index + previousHash + timestamp + JSON.stringify(data) + nonce);
    }
    return { index, timestamp, data, previousHash, hash, nonce };
  };

  const runPipeline = async (silent = false) => {
    let chain = loadChain();

    const add = async (lang, file, amount) => {
      const previousHash = chain.length ? chain[chain.length - 1].hash : '0';
      const blk = await mineBlock(chain.length, { lang, file, amount }, previousHash);
      if (!blk) return;
      chain.push(blk);
      if (!silent) appendOutput(`NXT ⥉ ${lang.toUpperCase()} ${file || 'Script'}: Block ${blk.index} mined: ${blk.hash}${amount !== undefined ? ` | Amount: ${amount}` : ''}`);
      return blk;
    };

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
    if (!silent) appendOutput('✅ Blockchain updated and saved to block/blockchain.json');
  };

  const runCommand = async (cmd) => {
    const args = cmd.trim().split(/\s+/).filter(Boolean);
    const main = (args[0] || '').toLowerCase();

    switch (main) {
      case 'help': {
        appendOutput(
          'Commands:\n' +
          'help              - show this help\n' +
          'start             - run blockchain pipeline\n' +
          'start -m N        - run blockchain pipeline N times (progress bar)\n' +
          'block             - print blockchain.json (pretty)\n' +
          'block -delete     - delete blockchain.json\n' +
          'block -download   - download blockchain.json from server\n' +
          'info              - show blockchain stats\n' +
          'clear             - clear screen'
        );
        break;
      }
      case 'clear': {
        setOutput([]);
        break;
      }
      case 'start': {
        if (args[1] === '-m' && !isNaN(parseInt(args[2]))) {
          const times = parseInt(args[2]);
          setIsMining(true);
          miningAbortRef.current = false;
          appendOutput(`Running blockchain (${times} runs)...`);
          appendOutput('0% [' + '-'.repeat(70) + ']');
          for (let i = 0; i < times; i++) {
            if (miningAbortRef.current) break;
            await runPipeline(true);
            const percent = Math.floor(((i + 1) / times) * 100);
            const filledCount = Math.floor((percent / 100) * 70);
            const filled = '='.repeat(filledCount);
            const empty = '-'.repeat(70 - filledCount);
            appendOutput(`${percent}% [${filled}${empty}]`, true);
          }
          if (!miningAbortRef.current) {
            appendOutput('✅ All runs completed.');
          } else {
            appendOutput('\n⛔ Mining aborted by user.');
          }
          setIsMining(false);
        } else {
          await runPipeline(false);
        }
        break;
      }
      case 'block': {
        if (args[1] === '-delete') {
          if (!localStorage.getItem('blockchain_json')) {
            appendOutput('Error: blockchain.json does not exist. Run start to create it.');
          } else {
            localStorage.removeItem('blockchain_json');
            setBlockchain([]);
            appendOutput('Blockchain deleted successfully.');
          }
        } else if (args[1] === '-download') {
          try {
            const res = await fetch("https://nxt-token.pp.ua/blockchain.json", { method: "HEAD" });
            if (res.ok) {
              appendOutput("Download blockchain here: https://nxt-token.pp.ua/blockchain.json");
            } else {
              appendOutput("Error: blockchain.json does not exist on server. Run start to create it.");
            }
          } catch (e) {
            appendOutput("Error: blockchain.json not reachable.");
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
          appendOutput(`Storage key: blockchain_json`);
        }
        break;
      }
      default: {
        if (main) appendOutput(`Unknown command: ${main}`);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (isMining && !(e.ctrlKey && e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      appendOutput(`> ${command}`);
      runCommand(command);
      setCommand('');
    }
  };

  return (
    <div
      className="w-screen h-screen bg-black text-green-500 font-mono p-4 overflow-y-auto select-text"
      ref={terminalRef}
      onClick={() => inputRef.current?.focus()}
    >
      {output.map((line, i) => (
        typeof line === 'string' ? (
          <div key={i} className="whitespace-pre-wrap break-words">{line}</div>
        ) : (
          <pre key={i} className="whitespace-pre-wrap break-words">{line.pre}</pre>
        )
      ))}
      <div className="mt-1 flex items-center gap-2">
        <span>&gt;</span>
        <input
          ref={inputRef}
          className="bg-black text-green-500 outline-none w-[80ch]"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isMining}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<BlockchainTerminal />);
