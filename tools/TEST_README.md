# e2b Writer - Local Testing Guide

This guide helps you test the e2b Writer locally before deploying to Keboola.

## Prerequisites

1. **Python 3.9+** installed on your system
2. **e2b API Key** - Get one from [e2b.dev](https://e2b.dev/docs)

## Quick Start

### Method 1: Automated Setup (Recommended)

1. **Set your e2b API key:**
   ```bash
   export E2B_API_KEY='your-api-key-here'
   ```

2. **Run the setup and test script:**
   ```bash
   ./setup_and_test.sh
   ```

This script will:
- Verify Python installation
- Check for E2B_API_KEY environment variable
- Create a virtual environment
- Install dependencies
- Run main.py with test cases

### Method 2: Manual Setup

1. **Set your e2b API key:**
   ```bash
   export E2B_API_KEY='your-api-key-here'
   ```

2. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the main script:**
   ```bash
   python main.py
   ```

## What the Test Does

The `main.py` script performs the following tests:

1. **Sandbox Creation**: Creates an e2b sandbox instance
2. **Simple Python Code**: Runs a "Hello World" test
3. **Package Installation**: Installs and uses pandas
4. **File Operations**: Creates and reads files in the sandbox
5. **File Listing**: Lists files in the sandbox filesystem

## Expected Output

```
============================================================
e2b Writer - Sandbox Test
============================================================
API Key loaded: e2b_1234...

Creating e2b sandbox...
✓ Sandbox created successfully!
  Sandbox ID: <sandbox-id>

Test 1: Running simple Python code...
  Output: Hello from e2b sandbox!

Test 2: Installing and using pandas...
  Output:
     name  age
0  Alice   25
1    Bob   30

DataFrame shape: (2, 2)

Test 3: Creating and reading a file...
  Output: File content: Hello from e2b file system!

Test 4: Listing files in /tmp...
  Output: Files in /tmp: ['test.txt']

============================================================
✓ All tests completed successfully!
============================================================
```

## Troubleshooting

### E2B_API_KEY not set
If you see: `ERROR: E2B_API_KEY environment variable is not set!`

**Solution:** Set the environment variable before running:
```bash
export E2B_API_KEY='your-api-key-here'
```

### Module not found: e2b_code_interpreter
If you see: `ModuleNotFoundError: No module named 'e2b_code_interpreter'`

**Solution:** Make sure you're in the virtual environment and dependencies are installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Connection errors
If you see connection errors, check:
1. Your internet connection
2. Your API key is valid
3. e2b service is accessible (check [e2b status](https://status.e2b.dev/))

## Next Steps

Once local testing is successful:

1. **Push code to GitHub** (already configured as https://github.com/keboola/e2b_writer_custom_python)
2. **Configure in Keboola** using the Chrome extension:
   - Click "Initialize Python & Git Configuration" button
   - Set your e2b API key in the extension
   - Save configuration
3. **Test in Keboola** by running the component

## File Structure

```
kbc-e2b-writer/
├── main.py              # Main script that creates e2b sandbox
├── requirements.txt     # Python dependencies (e2b-code-interpreter)
├── setup_and_test.sh    # Automated setup and test script
├── .env.example         # Example environment variables
└── TEST_README.md       # This file
```

## Resources

- [e2b Documentation](https://e2b.dev/docs)
- [e2b Python SDK](https://github.com/e2b-dev/e2b)
- [Keboola Custom Python Component](https://github.com/keboola/component-custom-python)
