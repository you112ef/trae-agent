"""
Cloudflare Function to execute Trae Agent tasks
"""

import json
import os
import asyncio
import tempfile
import traceback
from pathlib import Path
import sys

# Add the parent directory to sys.path to import trae_agent
current_dir = Path(__file__).parent
project_root = current_dir.parent.parent
sys.path.insert(0, str(project_root))

try:
    from trae_agent.agent import TraeAgent
    from trae_agent.utils.config import Config
    from trae_agent.utils.cli_console import CLIConsole
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback for when modules aren't available
    TraeAgent = None
    Config = None
    CLIConsole = None

# Import Response for Cloudflare Workers - Fixed import
try:
    # For Cloudflare Workers environment
    from js import Response
except ImportError:
    try:
        # Alternative import method
        import js
        Response = js.Response
    except ImportError:
        # Fallback for local development
        class Response:
            def __init__(self, body, status=200, headers=None):
                self.body = body
                self.status = status
                self.headers = headers or {}


def create_config_from_request(config_data):
    """Create a Config object from request data"""
    
    # Create a temporary config structure
    temp_config = {
        "default_provider": config_data.get("provider", "anthropic"),
        "max_steps": config_data.get("maxSteps", 20),
        "enable_lakeview": False,  # Disable for web interface
        "model_providers": {}
    }
    
    provider = config_data.get("provider", "anthropic")
    model = config_data.get("model", "claude-sonnet-4-20250514")
    api_key = config_data.get("apiKey", "")
    
    # Set up provider configuration
    temp_config["model_providers"][provider] = {
        "api_key": api_key,
        "model": model,
        "max_tokens": 4096,
        "temperature": 0.5,
        "top_p": 1,
        "max_retries": 10
    }
    
    if provider == "anthropic":
        temp_config["model_providers"][provider]["top_k"] = 0
    elif provider == "doubao":
        temp_config["model_providers"][provider]["base_url"] = "https://ark.cn-beijing.volces.com/api/v3/"
        temp_config["model_providers"][provider]["max_tokens"] = 8192
        temp_config["model_providers"][provider]["max_retries"] = 20
    elif provider == "azure":
        temp_config["model_providers"][provider]["base_url"] = os.environ.get("AZURE_BASE_URL", "")
        temp_config["model_providers"][provider]["api_version"] = "2024-03-01-preview"
    
    # Create a temporary config file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(temp_config, f)
        return f.name


async def execute_agent_task(task, config_data, session_id):
    """Execute a task using Trae Agent"""
    
    if not TraeAgent or not Config:
        return {
            "success": False,
            "error": "Trae Agent modules not available. Please check the deployment configuration."
        }
    
    try:
        # Create temporary working directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create config
            config_file = create_config_from_request(config_data)
            config = Config(config_file)
            
            # Clean up temp config file
            os.unlink(config_file)
            
            # Create agent
            agent = TraeAgent(config)
            
            # Set up trajectory recording with session ID
            trajectory_file = f"trajectory_{session_id}.json"
            trajectory_path = agent.setup_trajectory_recording(trajectory_file)
            
            # Create a simple console for web interface
            cli_console = CLIConsole(config) if CLIConsole else None
            if cli_console:
                agent.set_cli_console(cli_console)
            
            # Prepare task arguments
            task_args = {
                "project_path": temp_dir,
                "issue": task,
                "must_patch": "false",
                "patch_path": None
            }
            
            # Execute task
            agent.new_task(task, task_args)
            result = await agent.execute_task()
            
            # Collect results
            response_data = {
                "success": True,
                "response": f"Task completed successfully: {task}",
                "trajectory": {
                    "path": trajectory_path,
                    "steps": len(agent.trajectory) if hasattr(agent, 'trajectory') else 0,
                    "duration": "N/A"
                },
                "files": [],
                "output": ""
            }
            
            # Try to collect file changes
            try:
                temp_path = Path(temp_dir)
                created_files = []
                for file_path in temp_path.rglob("*"):
                    if file_path.is_file() and file_path.name != trajectory_file:
                        created_files.append({
                            "path": str(file_path.relative_to(temp_path)),
                            "action": "created"
                        })
                response_data["files"] = created_files
            except Exception as e:
                print(f"Error collecting files: {e}")
            
            # Add trajectory information if available
            try:
                if trajectory_path and os.path.exists(trajectory_path):
                    with open(trajectory_path, 'r') as f:
                        trajectory_data = json.load(f)
                        response_data["trajectory"]["steps"] = len(trajectory_data.get("steps", []))
                        
                        # Extract any output from the trajectory
                        steps = trajectory_data.get("steps", [])
                        outputs = []
                        for step in steps:
                            if "tool_result" in step and step["tool_result"]:
                                outputs.append(str(step["tool_result"]))
                        
                        if outputs:
                            response_data["output"] = "\n".join(outputs[-3:])  # Last 3 outputs
            except Exception as e:
                print(f"Error reading trajectory: {e}")
            
            return response_data
            
    except Exception as e:
        error_msg = f"Error executing task: {str(e)}"
        print(f"{error_msg}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": error_msg
        }


async def on_request(context):
    """Main Cloudflare Function handler"""
    
    # Handle CORS
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }
    
    request = context.request
    
    # Handle preflight requests
    if request.method == "OPTIONS":
        return Response(None, headers=headers)
    
    # Only allow POST requests
    if request.method != "POST":
        return Response(
            json.dumps({"success": False, "error": "Method not allowed"}),
            status=405,
            headers=headers
        )
    
    try:
        # Parse request body
        request_data = await request.json()
        
        task = request_data.get("task", "").strip()
        session_id = request_data.get("sessionId", "default")
        config_data = request_data.get("config", {})
        
        # Validate input
        if not task:
            return Response(
                json.dumps({"success": False, "error": "Task is required"}),
                status=400,
                headers=headers
            )
        
        if not config_data.get("apiKey"):
            return Response(
                json.dumps({"success": False, "error": "API key is required"}),
                status=400,
                headers=headers
            )
        
        # Execute the task
        result = await execute_agent_task(task, config_data, session_id)
        
        return Response(
            json.dumps(result),
            headers=headers
        )
        
    except json.JSONDecodeError:
        return Response(
            json.dumps({"success": False, "error": "Invalid JSON in request body"}),
            status=400,
            headers=headers
        )
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"{error_msg}\n{traceback.format_exc()}")
        return Response(
            json.dumps({"success": False, "error": error_msg}),
            status=500,
            headers=headers
        )


# For Cloudflare Workers compatibility
async def onRequest(context):
    """Alternative entry point name"""
    return await on_request(context)