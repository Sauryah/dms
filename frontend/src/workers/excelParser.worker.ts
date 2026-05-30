import * as XLSX from 'xlsx';

// Helper utility to parse string dimensions (e.g. "12.5mm", "8") into raw floats.
const parseSizeToFloat = (sizeStr: string): number => {
  const numericPart = sizeStr.match(/[\d\.]+/);
  if (numericPart) {
    const val = parseFloat(numericPart[0]);
    if (!isNaN(val)) return val;
  }
  return 0.0;
};

// Helper utility to format string dimensions to exactly 3 digits after the decimal point
const formatSizeString = (sizeStr: string): string => {
  const numericMatch = sizeStr.match(/[\d\.]+/);
  if (numericMatch) {
    const numVal = parseFloat(numericMatch[0]);
    if (!isNaN(numVal)) {
      const formattedNum = numVal.toFixed(3);
      return sizeStr.replace(numericMatch[0], formattedNum);
    }
  }
  return sizeStr;
};

self.onmessage = (e: MessageEvent) => {
  const { fileBuffer, existingSetNames } = e.data;

  try {
    const setSet = new Set<string>((existingSetNames || []).map((name: string) => name.trim()));
    const data = new Uint8Array(fileBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(sheet) as any[];

    if (sheetData.length > 5000) {
      self.postMessage({
        success: false,
        error: 'Import file is too large. Please limit imports to 5,000 rows or fewer.'
      });
      return;
    }

    const parsedRows: any[] = [];
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const dieId = row['Die ID']?.toString().trim() || '';
      const size = row['Size']?.toString().trim() || '';
      const casing = row['Casing']?.toString().trim() || '';
      const details = row['Details']?.toString().trim() || '';
      const setName = row['Set Name']?.toString().trim() || '';

      // Skip completely empty row
      if (!dieId && !size && !casing && !details && !setName) {
        continue;
      }

      const formattedSize = size ? formatSizeString(size) : '';
      const sizeValue = formattedSize ? parseSizeToFloat(formattedSize) : 0;

      const dieIdError = !dieId 
        ? 'Die ID is required' 
        : (!/^[a-zA-Z0-9-_\s]+$/.test(dieId) ? 'Die ID contains invalid characters' : null);
      const sizeError = !size 
        ? 'Size is required' 
        : (sizeValue <= 0 ? 'Invalid size dimensions' : null);
      const casingError = !casing 
        ? 'Casing is required' 
        : (casing.length < 2 ? 'Casing must be at least 2 characters' : null);

      const setNameWarning = (setName && !setSet.has(setName)) 
        ? `Set Name "${setName}" does not match any existing database set` 
        : null;

      parsedRows.push({
        key: i,
        dieId,
        size,
        casing,
        details,
        setName,
        errors: {
          dieId: dieIdError,
          size: sizeError,
          casing: casingError
        },
        warnings: {
          setName: setNameWarning
        }
      });
    }

    self.postMessage({
      success: true,
      parsedRows
    });
  } catch (error: any) {
    self.postMessage({
      success: false,
      error: error.message || 'Error processing spreadsheet file'
    });
  }
};
