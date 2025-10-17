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
        tuple: (api_key, mode, log_level) where mode is 'keboola' or 'local'
    """
    log_level = 'INFO'  # default

    # Try Keboola mode first
    try:
        from keboola.component import CommonInterface

        # Initialize CommonInterface - this sets up rich logging
        ci = CommonInterface()

        parameters = ci.configuration.parameters

        # Get log level from parameters (default: INFO)
        log_level = parameters.get('log_level', 'INFO').upper()

        # Configure logging level
        level_map = {
            'DEBUG': logging.DEBUG,
            'INFO': logging.INFO,
            'WARNING': logging.WARNING,
            'ERROR': logging.ERROR
        }
        logging.getLogger().setLevel(level_map.get(log_level, logging.INFO))

        # Suppress noisy e2b SDK logs unless DEBUG
        if log_level != 'DEBUG':
            logging.getLogger('httpx').setLevel(logging.WARNING)
            logging.getLogger('httpcore').setLevel(logging.WARNING)
            logging.getLogger('e2b').setLevel(logging.WARNING)
            logging.getLogger('e2b_code_interpreter').setLevel(logging.WARNING)

        logging.info(f"e2b Writer starting (mode: Keboola, log_level: {log_level})")

        # Try different possible keys for the API key
        possible_keys = ['#e2b_api_key', 'e2b_api_key']

        for key in possible_keys:
            if key in parameters:
                api_key = parameters[key]

                if api_key and api_key.strip():
                    logging.debug(f"Found e2b API key in parameter: {key}")
                    return api_key, 'keboola', log_level
                else:
                    logging.warning(f"Parameter '{key}' found but value is empty")

        # If we got here, CommonInterface loaded but no API key found
        logging.error("e2b API key not found in user parameters")
        logging.error(f"Checked keys: {possible_keys}, Available: {list(parameters.keys())}")
        sys.exit(1)

    except ImportError:
        # CommonInterface not available - we're in local testing mode
        # Configure basic logging for local development
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        # Suppress noisy e2b SDK logs in local mode too
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('httpcore').setLevel(logging.WARNING)
        logging.getLogger('e2b').setLevel(logging.WARNING)
        logging.getLogger('e2b_code_interpreter').setLevel(logging.WARNING)

        logging.info("e2b Writer starting (mode: local, log_level: INFO)")
        pass
    except Exception as e:
        logging.error("Error loading Keboola configuration")
        logging.exception(e, extra={"context": "initialization"})
        sys.exit(2)

    # Fall back to environment variable (local testing mode)
    api_key = os.environ.get('E2B_API_KEY')

    if not api_key:
        logging.error("E2B_API_KEY environment variable is not set")
        sys.exit(1)

    logging.debug(f"Using E2B_API_KEY from environment variable")
    return api_key, 'local', log_level

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
    logging.debug(f"Test {test_num}/{total_tests}: {test_name}")
    if description:
        logging.debug(f"  {description}")

    start_time = time.time()

    try:
        execution = sandbox.run_code(code)
        duration = time.time() - start_time

        stdout = ''.join(execution.logs.stdout).strip()
        stderr = ''.join(execution.logs.stderr).strip()

        if stderr:
            logging.warning(f"Test {test_num} produced stderr: {stderr[:100]}")

        if stdout:
            logging.info(f"✓ Test {test_num}/{total_tests}: {test_name} ({format_duration(duration)})")
            if logging.getLogger().level == logging.DEBUG:
                for line in stdout.split('\n')[:5]:  # Limit output lines
                    logging.debug(f"  {line}")
                if len(stdout.split('\n')) > 5:
                    logging.debug(f"  ... ({len(stdout.split('\n')) - 5} more lines)")
        else:
            logging.info(f"✓ Test {test_num}/{total_tests}: {test_name} ({format_duration(duration)}, no output)")

        return True, duration, stdout

    except Exception as e:
        duration = time.time() - start_time
        logging.error(f"❌ Test {test_num}/{total_tests} failed: {test_name} ({format_duration(duration)})")
        logging.exception(e, extra={"test_name": test_name, "duration": format_duration(duration)})
        return False, duration, None

def run_selftest(sandbox):
    """
    Run self-tests to verify e2b sandbox functionality

    Returns:
        tuple: (all_passed: bool, test_results: list)
    """
    logging.info("Running self-tests...")

    test_results = []
    total_tests = 5  # Increased to 5 to include error logging demo

    # Test 1: Simple Python code
    success, duration, output = run_test(
        "Simple Python",
        1, total_tests,
        sandbox,
        "print('Hello from e2b sandbox!')",
        "Testing basic Python code execution"
    )
    test_results.append(("Simple Python", success, duration))

    # Test 2: Package installation and usage
    success, duration, output = run_test(
        "Pandas Usage",
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
        "File Operations",
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

    # Test 5: Demo error logging
    logging.info(f"Test 5/{total_tests}: Error Logging Demo")
    logging.warning("This is a demo WARNING message")
    logging.error("This is a demo ERROR message (not a real error)")
    test_results.append(("Error Logging Demo", True, 0.0))
    logging.info(f"✓ Test 5/{total_tests}: Error Logging Demo (0ms)")

    # Print summary
    passed = sum(1 for _, success, _ in test_results if success)
    failed = len(test_results) - passed
    total_test_time = sum(duration for _, _, duration in test_results)

    if failed > 0:
        logging.error(f"Tests completed: {passed}/{total_tests} passed, {failed} failed (total: {format_duration(total_test_time)})")
        return False, test_results
    else:
        logging.info(f"✓ All tests passed: {total_tests}/{total_tests} (total: {format_duration(total_test_time)})")
        return True, test_results


def process_input_data(sandbox):
    """
    Process input data from Keboola Input Mapping and transfer to e2b sandbox

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from keboola.component import CommonInterface

        ci = CommonInterface()
        input_tables = ci.configuration.tables_input_mapping

        if not input_tables:
            logging.info("No input tables configured in Input Mapping")
            return True

        logging.info(f"Found {len(input_tables)} input table(s) in Input Mapping")

        # Log data directory information for debugging
        data_dir = ci.data_folder_path
        logging.debug(f"Data folder path: {data_dir}")
        if os.path.exists(os.path.join(data_dir, 'in', 'tables')):
            tables_dir = os.path.join(data_dir, 'in', 'tables')
            files_in_dir = os.listdir(tables_dir)
            logging.debug(f"Files in {tables_dir}: {files_in_dir}")
        else:
            logging.warning(f"Input tables directory does not exist: {os.path.join(data_dir, 'in', 'tables')}")

        # Process each input table
        for idx, table in enumerate(input_tables, 1):
            # Note: table is an object with properties, not a dict
            table_name = table.destination
            logging.info(f"Processing table {idx}/{len(input_tables)}: {table_name}")
            logging.debug(f"  Source: {table.source if hasattr(table, 'source') else 'N/A'}")
            logging.debug(f"  Destination: {table.destination}")

            try:
                # Get table definition (includes full_path)
                logging.debug(f"  Calling get_input_table_definition_by_name('{table_name}')")
                table_def = ci.get_input_table_definition_by_name(table_name)
                logging.debug(f"  Full path: {table_def.full_path}")
                logging.debug(f"  Columns: {table_def.column_names if hasattr(table_def, 'column_names') else table_def.columns}")
                local_path = table_def.full_path

                logging.info(f"  Local path: {local_path}")
                logging.info(f"  Columns: {', '.join(table_def.column_names if hasattr(table_def, 'column_names') else table_def.columns)}")

                # Check if file exists
                if not os.path.exists(local_path):
                    logging.error(f"  File not found: {local_path}")
                    return False

                # Get file size
                file_size = os.path.getsize(local_path)
                logging.info(f"  File size: {file_size:,} bytes")

                # Read CSV file content
                logging.debug(f"  Reading CSV content from {local_path}")
                transfer_start = time.time()
                with open(local_path, 'r') as f:
                    csv_content = f.read()

                csv_size_mb = len(csv_content) / (1024 * 1024)
                logging.debug(f"  Read {len(csv_content):,} characters ({csv_size_mb:.2f} MB)")

                # Upload to e2b sandbox
                remote_path = f"/tmp/{table_name}"
                logging.info(f"  Uploading to sandbox: {remote_path}")

                # Write file to sandbox
                logging.debug("  Executing sandbox.run_code() to write file...")
                try:
                    execution = sandbox.run_code(f"""
with open('{remote_path}', 'w') as f:
    f.write({repr(csv_content)})
print(f"File written: {remote_path}")

# Verify file
import os
size = os.path.getsize('{remote_path}')
print(f"File size: {{size}} bytes")
""")
                    logging.debug("  Sandbox execution completed")
                except Exception as sandbox_error:
                    logging.error(f"  Sandbox execution failed: {type(sandbox_error).__name__}")
                    logging.exception(sandbox_error, extra={"table_name": table_name, "remote_path": remote_path})
                    raise

                transfer_duration = time.time() - transfer_start

                # Check output
                stdout = ''.join(execution.logs.stdout).strip()
                stderr = ''.join(execution.logs.stderr).strip()

                logging.debug(f"  Sandbox stdout length: {len(stdout)} chars")
                logging.debug(f"  Sandbox stderr length: {len(stderr)} chars")

                if stderr:
                    logging.warning(f"  Transfer produced stderr: {stderr[:200]}")

                if stdout:
                    logging.info(f"  ✓ Transfer complete ({format_duration(transfer_duration)})")
                    if logging.getLogger().level == logging.DEBUG:
                        for line in stdout.split('\n'):
                            logging.debug(f"    {line}")
                else:
                    logging.warning(f"  Transfer completed but no output received ({format_duration(transfer_duration)})")

            except Exception as e:
                logging.error(f"  Failed to process table: {table_name}")
                logging.exception(e, extra={"table_name": table_name, "table_index": idx})
                return False

        logging.info(f"✓ All {len(input_tables)} table(s) transferred to sandbox")
        return True

    except ImportError:
        # Not in Keboola mode - can't access input mapping
        logging.warning("CommonInterface not available - skipping input data processing")
        return True
    except Exception as e:
        logging.error("Failed to process input data")
        logging.exception(e, extra={"context": "process_input_data"})
        return False


def main():
    """Main execution function"""

    script_start = time.time()

    # Get API key from Keboola user parameters or environment variable
    api_key, mode, log_level = get_api_key_and_init_logging()

    # IMPORTANT: e2b SDK reads API key from E2B_API_KEY environment variable
    # Set it here regardless of where we got it from (Keboola params or env var)
    os.environ['E2B_API_KEY'] = api_key

    # Check selftest mode
    selftest_mode = False
    if mode == 'keboola':
        try:
            from keboola.component import CommonInterface
            ci = CommonInterface()
            selftest_mode = ci.configuration.parameters.get('selftest', False)
            logging.info(f"Selftest mode: {selftest_mode}")
        except Exception as e:
            logging.warning("Could not read selftest parameter, defaulting to False")
            logging.debug(str(e))

    sandbox = None
    sandbox_id = None

    try:
        # Create sandbox (API key is read from E2B_API_KEY environment variable)
        logging.info("Creating e2b sandbox...")
        logging.debug("Calling Sandbox.create()...")

        sandbox_start = time.time()
        try:
            sandbox = Sandbox.create()
        except Exception as create_error:
            logging.error(f"Failed to create sandbox: {type(create_error).__name__}: {str(create_error)}")
            logging.exception(create_error, extra={"context": "sandbox_creation"})
            raise

        sandbox_duration = time.time() - sandbox_start
        sandbox_id = sandbox.sandbox_id

        logging.info(f"✓ Sandbox created: {sandbox_id} ({format_duration(sandbox_duration)})")
        logging.debug(f"Sandbox type: {type(sandbox).__name__}")

        # Run appropriate workflow based on selftest mode
        if selftest_mode:
            # Run self-tests
            logging.info("Starting self-test mode...")
            all_passed, test_results = run_selftest(sandbox)
            if not all_passed:
                logging.error("Self-tests failed")
                sys.exit(1)
            logging.info("✓ All self-tests passed")
        else:
            # Process input data
            logging.info("Starting input data processing...")
            logging.debug("Calling process_input_data()...")
            success = process_input_data(sandbox)
            if not success:
                logging.error("Input data processing failed")
                sys.exit(1)
            logging.info("✓ Input data processing completed successfully")

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logging.error(f"Fatal error occurred during execution: {error_type}: {error_msg}")
        logging.exception(e, extra={
            "context": "main_execution",
            "sandbox_id": sandbox_id,
            "error_type": error_type,
            "selftest_mode": selftest_mode
        })
        sys.exit(1)

    finally:
        # Clean up sandbox
        if sandbox:
            logging.debug("Cleaning up sandbox...")

            cleanup_start = time.time()
            try:
                sandbox.kill()
                cleanup_duration = time.time() - cleanup_start
                logging.info(f"✓ Sandbox terminated ({format_duration(cleanup_duration)})")
            except Exception as e:
                cleanup_duration = time.time() - cleanup_start
                logging.warning(f"Error during sandbox cleanup ({format_duration(cleanup_duration)})")
                logging.exception(e, extra={"context": "cleanup", "sandbox_id": sandbox_id, "duration": format_duration(cleanup_duration)})

        # Print execution summary
        total_duration = time.time() - script_start
        logging.info(f"Execution completed in {format_duration(total_duration)}")

if __name__ == "__main__":
    main()
