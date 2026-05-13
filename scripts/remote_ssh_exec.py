from __future__ import annotations

import argparse
import pathlib
import re
import shutil
import subprocess
import sys


def get_current_user_sid() -> str:
    result = subprocess.run(
        ["whoami", "/user"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=True,
    )
    match = re.search(r"(S-\d-(?:\d+-)+\d+)", result.stdout)
    if not match:
        raise RuntimeError("无法识别当前 Windows 用户 SID")
    return match.group(1)


def set_private_key_permissions(key_path: pathlib.Path, sid: str) -> None:
    commands = [
        ["icacls", str(key_path), "/inheritance:r"],
        [
            "icacls",
            str(key_path),
            "/remove:g",
            "Everyone",
            r"BUILTIN\Users",
            r"NT AUTHORITY\Authenticated Users",
            r"BUILTIN\Administrators",
            r"NT AUTHORITY\SYSTEM",
        ],
        ["icacls", str(key_path), "/grant:r", f"*{sid}:R"],
    ]
    for command in commands:
        subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="通过 Windows OpenSSH 使用临时 ASCII 路径私钥执行远程脚本"
    )
    parser.add_argument("--key", required=True, help="本地私钥路径")
    parser.add_argument("--host", required=True, help="远程主机，格式 user@host")
    parser.add_argument("--port", default="22", help="SSH 端口，默认 22")
    parser.add_argument(
        "--script-file",
        help="要通过 stdin 发送到远端 bash -s 的脚本文件。若不提供则从 stdin 读取。",
    )
    parser.add_argument(
        "--temp-key-path",
        default=r"C:\Users\Public\cline-ssh-runtime.pem",
        help="临时私钥副本路径，默认放到 ASCII 路径下。",
    )
    args = parser.parse_args()

    source_key = pathlib.Path(args.key)
    temp_key = pathlib.Path(args.temp_key_path)
    if not source_key.exists():
        raise FileNotFoundError(f"私钥不存在: {source_key}")

    if args.script_file:
        script_text = pathlib.Path(args.script_file).read_text(encoding="utf-8-sig")
    else:
        script_text = sys.stdin.read()

    script_text = script_text.replace("\r\n", "\n").replace("\r", "\n")

    if not script_text.strip():
        raise RuntimeError("远程脚本内容为空")

    sid = get_current_user_sid()
    shutil.copyfile(source_key, temp_key)
    set_private_key_permissions(temp_key, sid)

    command = [
        r"C:\Windows\System32\OpenSSH\ssh.exe",
        "-i",
        str(temp_key),
        "-o",
        "IdentitiesOnly=yes",
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-o",
        "ConnectTimeout=20",
        "-p",
        str(args.port),
        args.host,
        "bash",
        "-s",
    ]

    try:
        result = subprocess.run(
            command,
            input=script_text.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        sys.stdout.write(result.stdout.decode("utf-8", errors="replace"))
        return result.returncode
    finally:
        try:
            temp_key.unlink()
        except OSError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())