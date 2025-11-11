"use client";

import { Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { SDKSystemMessage } from "@anthropic-ai/claude-agent-sdk";

interface SystemInfoProps {
  systemMessage: SDKSystemMessage;
}

export function SystemInfo({ systemMessage }: SystemInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[90vw] max-w-md">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 font-semibold">系统信息</h4>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">会话ID:</span>
              <span className="font-mono text-xs">
                {systemMessage.session_id}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">模型:</span>
              <span>{systemMessage.model}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">权限模式:</span>
              <span>{systemMessage.permissionMode}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">输出风格:</span>
              <span>{systemMessage.output_style}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Claude Code版本:</span>
              <span>{systemMessage.claude_code_version}</span>
            </div>

            {systemMessage.agents && systemMessage.agents.length > 0 && (
              <div>
                <span className="text-muted-foreground">代理:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {systemMessage.agents.map((agent, index) => (
                    <span
                      key={index}
                      className="bg-muted rounded px-2 py-1 text-xs"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {systemMessage.tools && systemMessage.tools.length > 0 && (
              <div>
                <span className="text-muted-foreground">工具:</span>
                <div className="mt-1 max-h-20 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {systemMessage.tools.map((tool, index) => (
                      <span
                        key={index}
                        className="bg-muted rounded px-2 py-1 text-xs"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {systemMessage.mcp_servers &&
              systemMessage.mcp_servers.length > 0 && (
                <div>
                  <span className="text-muted-foreground">MCP服务器:</span>
                  <div className="mt-1 space-y-1">
                    {systemMessage.mcp_servers.map((server, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs"
                      >
                        <span>{server.name}</span>
                        <span
                          className={`rounded px-2 py-1 ${
                            server.status === "connected"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {server.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {systemMessage.slash_commands &&
              systemMessage.slash_commands.length > 0 && (
                <div>
                  <span className="text-muted-foreground">斜杠命令:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {systemMessage.slash_commands.map((cmd, index) => (
                      <span
                        key={index}
                        className="bg-muted rounded px-2 py-1 text-xs"
                      >
                        /{cmd}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {systemMessage.skills && systemMessage.skills.length > 0 && (
              <div>
                <span className="text-muted-foreground">技能:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {systemMessage.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-muted rounded px-2 py-1 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {systemMessage.plugins && systemMessage.plugins.length > 0 && (
              <div>
                <span className="text-muted-foreground">插件:</span>
                <div className="mt-1 space-y-1">
                  {systemMessage.plugins.map((plugin, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-medium">{plugin.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {plugin.path}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
