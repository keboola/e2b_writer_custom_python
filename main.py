#!/usr/bin/env python3
"""
e2b Writer - Main Entry Point
This script creates an e2b sandbox and demonstrates basic functionality.
Supports both Keboola (user parameters) and local testing (environment variables).
"""

import os
import sys
import logging
import time
from datetime import datetime
from e2b_code_interpreter import Sandbox

def get_api_key_and_init_logging():
    """
    Get e2b API key and initialize logging.

    Priority:
    1. Keboola user parameters (#e2b_api_key) - for production use
    2. Environment variable (E2B_API_KEY) - for local testing

    Returns:
        tuple: (api_key, mode) where mode is 'keboola' or 'local'
    """
    # Try Keboola mode first
    try:
        from keboola.component import CommonInterface

        # Initialize CommonInterface - this sets up rich logging
        ci = CommonInterface()

        # Now logging is properly configured for Keboola
        logging.info("=" * 60)
        logging.info("Initializing e2b Writer in Keboola mode")
        logging.info("=" * 60)

        parameters = ci.configuration.parameters
        logging.debug(f"Available parameter keys: {list(parameters.keys())}")

        # Try different possible keys for the API key
        possible_keys = ['#e2b_api_key', 'e2b_api_key']

        for key in possible_keys:
            if key in parameters:
                api_key = parameters[key]

                if api_key and api_key.strip():
                    key_preview = f"{api_key[:8]}..." if len(api_key) > 8 else "***"
                    logging.info(f"✓ Found e2b API key in parameter: {key}")
                    logging.info(f"  API key preview: {key_preview}")
                    logging.info(f"  API key length: {len(api_key)} characters")
                    return api_key, 'keboola'
                else:
                    logging.warning(f"⚠ Parameter '{key}' found but value is empty")

        # If we got here, CommonInterface loaded but no API key found
        logging.error("=" * 60)
        logging.error("❌ e2b API key not found in user parameters")
        logging.error(f"  Checked keys: {possible_keys}")
        logging.error(f"  Available parameters: {list(parameters.keys())}")
        logging.error("=" * 60)
        sys.exit(1)

    except ImportError:
        # CommonInterface not available - we're in local testing mode
        # Configure basic logging for local development
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        logging.info("=" * 60)
        logging.info("Initializing e2b Writer in local testing mode")
        logging.info("=" * 60)
        pass
    except Exception as e:
        logging.error("=" * 60)
        logging.error("❌ Error loading Keboola configuration")
        logging.exception(f"  Exception: {str(e)}")
        logging.error("=" * 60)
        sys.exit(2)

    # Fall back to environment variable (local testing mode)
    api_key = os.environ.get('E2B_API_KEY')

    if not api_key:
        logging.error("=" * 60)
        logging.error("❌ E2B_API_KEY environment variable is not set")
        logging.error("  For local testing: export E2B_API_KEY='your-api-key-here'")
        logging.error("=" * 60)
        sys.exit(1)

    key_preview = f"{api_key[:8]}..." if len(api_key) > 8 else "***"
    logging.info(f"✓ Using E2B_API_KEY from environment variable")
    logging.info(f"  API key preview: {key_preview}")
    return api_key, 'local'

def format_duration(seconds):
    """Format duration in a human-readable way"""
    if seconds < 1:
        return f"{seconds*1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.2f}s"
    else:
        mins = int(seconds // 60)
        secs = seconds % 60
        return f"{mins}m {secs:.2f}s"

def run_test(test_name, test_num, total_tests, sandbox, code, description=None):
    """
    Run a test with proper logging and timing

    Returns:
        tuple: (success: bool, duration: float, output: str)
    """
    logging.info("")
    logging.info("-" * 60)
    logging.info(f"Test {test_num}/{total_tests}: {test_name}")
    if description:
        logging.info(f"  {description}")
    logging.info("-" * 60)

    start_time = time.time()

    try:
        execution = sandbox.run_code(code)
        duration = time.time() - start_time

        stdout = ''.join(execution.logs.stdout).strip()
        stderr = ''.join(execution.logs.stderr).strip()

        if stderr:
            logging.warning(f"⚠ Test produced stderr output:")
            for line in stderr.split('\n'):
                logging.warning(f"  {line}")

        if stdout:
            logging.info("✓ Test completed successfully")
            logging.info(f"  Duration: {format_duration(duration)}")
            logging.info(f"  Output:")
            for line in stdout.split('\n'):
                logging.info(f"    {line}")
        else:
            logging.info("✓ Test completed (no output)")
            logging.info(f"  Duration: {format_duration(duration)}")

        return True, duration, stdout

    except Exception as e:
        duration = time.time() - start_time
        logging.error(f"❌ Test failed after {format_duration(duration)}")
        logging.exception(e, extra={"test_name": test_name, "duration": format_duration(duration)})
        return False, duration, None

def main():
    """Main execution function"""

    script_start = time.time()

    # Track test results
    test_results = []

    # Get API key from Keboola user parameters or environment variable
    api_key, mode = get_api_key_and_init_logging()

    logging.info("")
    logging.info("Configuration Summary:")
    logging.info(f"  Mode: {mode}")
    logging.info(f"  Timestamp: {datetime.now().isoformat()}")
    logging.info("")

    # IMPORTANT: e2b SDK reads API key from E2B_API_KEY environment variable
    # Set it here regardless of where we got it from (Keboola params or env var)
    os.environ['E2B_API_KEY'] = api_key
    logging.info("✓ E2B_API_KEY environment variable set for SDK")

    sandbox = None
    sandbox_id = None

    try:
        # Create sandbox (API key is read from E2B_API_KEY environment variable)
        logging.info("")
        logging.info("=" * 60)
        logging.info("Creating e2b sandbox...")
        logging.info("=" * 60)

        sandbox_start = time.time()
        sandbox = Sandbox.create()
        sandbox_duration = time.time() - sandbox_start
        sandbox_id = sandbox.sandbox_id

        logging.info(f"✓ Sandbox created successfully in {format_duration(sandbox_duration)}")
        logging.info(f"  Sandbox ID: {sandbox_id}")

        # Run tests
        total_tests = 4

        # Test 1: Simple Python code
        success, duration, output = run_test(
            "Simple Python Execution",
            1, total_tests,
            sandbox,
            "print('Hello from e2b sandbox!')",
            "Testing basic Python code execution"
        )
        test_results.append(("Simple Python", success, duration))

        # Test 2: Package installation and usage
        success, duration, output = run_test(
            "Package Installation (pandas)",
            2, total_tests,
            sandbox,
            """
import pandas as pd
df = pd.DataFrame({'name': ['Alice', 'Bob'], 'age': [25, 30]})
print(df)
print(f"\\nDataFrame shape: {df.shape}")
""",
            "Installing pandas and creating a DataFrame"
        )
        test_results.append(("Pandas Usage", success, duration))

        # Test 3: File operations
        success, duration, output = run_test(
            "File System Operations",
            3, total_tests,
            sandbox,
            """
with open('/tmp/test.txt', 'w') as f:
    f.write('Hello from e2b file system!')

with open('/tmp/test.txt', 'r') as f:
    content = f.read()
    print(f"File content: {content}")
""",
            "Creating and reading files in sandbox"
        )
        test_results.append(("File Operations", success, duration))

        # Test 4: Directory listing
        success, duration, output = run_test(
            "Directory Listing",
            4, total_tests,
            sandbox,
            """
import os
files = os.listdir('/tmp')
print(f"Files in /tmp: {files}")
""",
            "Listing files in sandbox file system"
        )
        test_results.append(("Directory Listing", success, duration))

        # Print summary
        logging.info("")
        logging.info("=" * 60)
        logging.info("TEST SUMMARY")
        logging.info("=" * 60)

        passed = sum(1 for _, success, _ in test_results if success)
        failed = len(test_results) - passed
        total_test_time = sum(duration for _, _, duration in test_results)

        logging.info(f"Total tests: {len(test_results)}")
        logging.info(f"  Passed: {passed}")
        logging.info(f"  Failed: {failed}")
        logging.info(f"  Total test time: {format_duration(total_test_time)}")
        logging.info("")

        logging.info("Individual test results:")
        for name, success, duration in test_results:
            status = "✓ PASS" if success else "❌ FAIL"
            logging.info(f"  {status} - {name}: {format_duration(duration)}")

        if failed > 0:
            logging.error("")
            logging.error(f"❌ {failed} test(s) failed!")
            logging.error("=" * 60)
            sys.exit(1)
        else:
            logging.info("")
            logging.info("✓ All tests passed!")
            logging.info("=" * 60)

    except Exception as e:
        logging.error("")
        logging.error("=" * 60)
        logging.error("❌ Fatal error occurred")
        logging.error("=" * 60)
        logging.exception(e, extra={"context": "main_execution", "sandbox_id": sandbox_id})
        logging.error("")
        sys.exit(1)

    finally:
        # Clean up sandbox
        if sandbox:
            logging.info("")
            logging.info("-" * 60)
            logging.info("Cleaning up sandbox...")
            logging.info("-" * 60)

            cleanup_start = time.time()
            try:
                sandbox.kill()
                cleanup_duration = time.time() - cleanup_start
                logging.info(f"✓ Sandbox terminated in {format_duration(cleanup_duration)}")
                if sandbox_id:
                    logging.info(f"  Sandbox ID: {sandbox_id}")
            except Exception as e:
                cleanup_duration = time.time() - cleanup_start
                logging.warning(f"⚠ Error during cleanup (after {format_duration(cleanup_duration)})")
                logging.exception(e, extra={"context": "cleanup", "sandbox_id": sandbox_id, "duration": format_duration(cleanup_duration)})

        # Print execution summary
        total_duration = time.time() - script_start
        logging.info("")
        logging.info("=" * 60)
        logging.info("EXECUTION SUMMARY")
        logging.info("=" * 60)
        logging.info(f"Total execution time: {format_duration(total_duration)}")
        logging.info(f"Completed at: {datetime.now().isoformat()}")
        logging.info("=" * 60)

if __name__ == "__main__":
    main()
