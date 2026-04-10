/**
 * LTspice .raw binary file parser.
 *
 * Supports transient (Flags: real) simulations:
 *   - time variable: 64-bit double (8 bytes)
 *   - all other variables: 32-bit float (4 bytes)
 *
 * Returns: { variables, time, signals }
 *   - variables: string[] — variable names in order
 *   - time: number[]     — time points in seconds
 *   - signals: { [name: string]: number[] } — signal values per time point
 */

function parseRaw(buffer) {
  // Locate the "Binary:\n" or "Binary:\r\n" boundary
  let binaryStart = -1;
  for (let i = 0; i < buffer.length - 7; i++) {
    if (
      buffer[i] === 0x42 && buffer[i + 1] === 0x69 && buffer[i + 2] === 0x6e &&
      buffer[i + 3] === 0x61 && buffer[i + 4] === 0x72 && buffer[i + 5] === 0x79 &&
      buffer[i + 6] === 0x3a
    ) {
      // Found "Binary:" — skip past the newline(s)
      let skip = i + 7;
      if (buffer[skip] === 0x0d) skip++; // \r
      if (buffer[skip] === 0x0a) skip++; // \n
      binaryStart = skip;
      break;
    }
  }
  if (binaryStart === -1) throw new Error('No Binary: section found in .raw file');

  const header = buffer.slice(0, binaryStart).toString('latin1');
  const binaryData = buffer.slice(binaryStart);

  // Parse No. Variables and No. Points
  const numVarsMatch = header.match(/No\.\s*Variables:\s*(\d+)/i);
  const numPointsMatch = header.match(/No\.\s*Points:\s*(\d+)/i);
  if (!numVarsMatch || !numPointsMatch) {
    throw new Error('Could not find No. Variables or No. Points in header');
  }
  const numVars = parseInt(numVarsMatch[1], 10);
  const numPoints = parseInt(numPointsMatch[1], 10);

  // Detect if double-precision throughout (Flags: double) or mixed real (default)
  const isAllDouble = /Flags:.*\bdouble\b/i.test(header);
  // For AC: complex flag
  const isComplex = /Flags:.*\bcomplex\b/i.test(header);

  // Parse variable names from the Variables: section
  // Format per line: \t<index>\t<name>\t<type>
  const variablesSection = header.match(/Variables:\s*\r?\n([\s\S]*?)(?:\r?\n(?:[A-Z]|$))/i);
  const variableNames = [];
  if (variablesSection) {
    const lines = variablesSection[1].split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*\d+\s+(\S+)/);
      if (m) variableNames.push(m[1]);
    }
  }

  // Fallback: generate generic variable names if parsing failed
  while (variableNames.length < numVars) {
    variableNames.push(variableNames.length === 0 ? 'time' : `V${variableNames.length}`);
  }

  // Compute bytes per data point
  // Real (transient): time=8 bytes double, rest=4 bytes float each
  // All-double: all 8 bytes
  // Complex (AC): each var=8 bytes (2×float32 real+imag)
  let bytesPerPoint;
  if (isAllDouble) {
    bytesPerPoint = numVars * 8;
  } else if (isComplex) {
    bytesPerPoint = 8 + (numVars - 1) * 8; // freq=double, rest=complex(2×float)
  } else {
    // Standard real/transient: time=8, others=4
    bytesPerPoint = 8 + (numVars - 1) * 4;
  }

  const time = [];
  const signals = {};
  for (const name of variableNames) signals[name] = [];

  for (let i = 0; i < numPoints; i++) {
    const base = i * bytesPerPoint;
    if (base + bytesPerPoint > binaryData.length) break;

    // Time (index 0) is always double
    const t = binaryData.readDoubleLE(base);
    time.push(t);
    signals[variableNames[0]].push(t);

    // Remaining variables
    for (let j = 1; j < numVars && j < variableNames.length; j++) {
      let val;
      if (isAllDouble) {
        val = binaryData.readDoubleLE(base + j * 8);
      } else if (isComplex) {
        // Return magnitude for AC
        const re = binaryData.readFloatLE(base + 8 + (j - 1) * 8);
        const im = binaryData.readFloatLE(base + 8 + (j - 1) * 8 + 4);
        val = Math.sqrt(re * re + im * im);
      } else {
        val = binaryData.readFloatLE(base + 8 + (j - 1) * 4);
      }
      signals[variableNames[j]].push(val);
    }
  }

  return { variables: variableNames, time, signals };
}

module.exports = { parseRaw };
