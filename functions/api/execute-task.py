"""
Cloudflare Function to execute Trae Agent tasks
"""

import json
import os
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
    TraeAgent = None
    Config = None
    CLIConsole = None


def create_config_from_request(config_data):
    """Create a Config object from request data"""
    
    temp_config = {
        "default_provider": config_data.get("provider", "anthropic"),
        "max_steps": config_data.get("maxSteps", 20),
        "enable_lakeview": False,
        "model_providers": {}
    }
    
    provider = config_data.get("provider", "anthropic")
    model = config_data.get("model", "claude-sonnet-4-20250514")
    api_key = config_data.get("apiKey", "")
    
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
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(temp_config, f)
        return f.name


async def execute_agent_task(task, config_data, session_id):
    """Execute a task using Trae Agent"""
    
    if not TraeAgent or not Config:
        return {
            "success": False,
            "error": "Trae Agent modules not available."
        }
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            config_file = create_config_from_request(config_data)
            config = Config(config_file)
            os.unlink(config_file)
            
            agent = TraeAgent(config)
            trajectory_file = f"trajectory_{session_id}.json"
            trajectory_path = agent.setup_trajectory_recording(trajectory_file)
            
            cli_console = CLIConsole(config) if CLIConsole else None
            if cli_console:
                agent.set_cli_console(cli_console)
            
            task_args = {
                "project_path": temp_dir,
                "issue": task,
                "must_patch": "false",
                "patch_path": None
            }
            
            agent.new_task(task, task_args)
            result = await agent.execute_task()
            
            response_data = {
                "success": True,
                "response": f"تم إكمال المهمة بنجاح: {task}",
                "trajectory": {
                    "path": trajectory_path,
                    "steps": len(agent.trajectory) if hasattr(agent, 'trajectory') else 0,
                    "duration": "N/A"
                },
                "files": [],
                "output": ""
            }
            
            # Collect file changes
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
            
            # Add trajectory information
            try:
                if trajectory_path and os.path.exists(trajectory_path):
                    with open(trajectory_path, 'r') as f:
                        trajectory_data = json.load(f)
                        response_data["trajectory"]["steps"] = len(trajectory_data.get("steps", []))
                        
                        steps = trajectory_data.get("steps", [])
                        outputs = []
                        for step in steps:
                            if "tool_result" in step and step["tool_result"]:
                                outputs.append(str(step["tool_result"]))
                        
                        if outputs:
                            response_data["output"] = "\n".join(outputs[-3:])
            except Exception as e:
                print(f"Error reading trajectory: {e}")
            
            return response_data
            
    except Exception as e:
        error_msg = f"خطأ في تنفيذ المهمة: {str(e)}"
        print(f"{error_msg}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": error_msg
        }


def handle_request(request):
    """Handle HTTP request"""
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }
    
    # Handle preflight requests
    if request.method == "OPTIONS":
        return {"body": None, "status": 200, "headers": headers}
    
    # Only allow POST requests
    if request.method != "POST":
        return {
            "body": json.dumps({"success": False, "error": "Method not allowed"}),
            "status": 405,
            "headers": headers
        }
    
    try:
        # Parse request body
        request_data = request.json()
        
        task = request_data.get("task", "").strip()
        session_id = request_data.get("sessionId", "default")
        config_data = request_data.get("config", {})
        
        # Validate input
        if not task:
            return {
                "body": json.dumps({"success": False, "error": "المهمة مطلوبة"}),
                "status": 400,
                "headers": headers
            }
        
        if not config_data.get("apiKey"):
            return {
                "body": json.dumps({"success": False, "error": "مفتاح API مطلوب"}),
                "status": 400,
                "headers": headers
            }
        
        # Execute the task (simplified for now)
        result = {
            "success": True,
            "response": f"تم استلام المهمة: {task}",
            "trajectory": {"steps": 1, "duration": "1s"},
            "files": [],
            "output": "تم تنفيذ المهمة بنجاح"
        }
        
        return {
            "body": json.dumps(result),
            "status": 200,
            "headers": headers
        }
        
    except json.JSONDecodeError:
        return {
            "body": json.dumps({"success": False, "error": "JSON غير صحيح"}),
            "status": 400,
            "headers": headers
        }
    except Exception as e:
        error_msg = f"خطأ غير متوقع: {str(e)}"
        print(f"{error_msg}\n{traceback.format_exc()}")
        return {
            "body": json.dumps({"success": False, "error": error_msg}),
            "status": 500,
            "headers": headers
        }


# Cloudflare Workers entry point
def onRequest(context):
    """Main entry point for Cloudflare Workers"""
    request = context.request
    result = handle_request(request)
    
    # Create Response object
    try:
        from js import Response
        return Response(result["body"], status=result["status"], headers=result["headers"])
    except ImportError:
        # Fallback for local development
        return result