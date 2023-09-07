#!/usr/bin/env python
# -*- coding: utf-8 -*-

################################################################################
# Copyright 2022 PORTAL301 CO., LTD.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
################################################################################

#stderr do not use buffering, but stdout use buffering.
#Therefore, we need to set flush=True to 'pipe' stdout from external program.
import functools
print = functools.partial(print, flush=True) 
from time import time, sleep
import os
import sys
from pickle import FALSE
import platform
import numpy as np
import time
import json
sys.path.append("./src")
# from dxl_registerMap import *

if os.name == 'nt':
    import msvcrt
    def getch():
        return msvcrt.getch().decode()
else:
    import sys, tty, termios
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    def getch():
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ch

sys.path.append("./")

from DynamixelSDK.python.src.dynamixel_sdk import *                     # Uses Dynamixel SDK library
from src.scan_ports import *




ports={}
for port in COMPorts.get_com_ports().data:
    print("PORT:[{}]  /  DESCRIPTION:{}".format(port.device, port.description))
    ports[port.description]={"port":port.device,"baudrate":57600}

if platform.system() == "Linux":
    serialPort = ports.get("USB <-> Serial Converter - USB <-> Serial Converter")
elif platform.system() == "Windows":
    serialPort = ports.get("USB Serial Port")

if serialPort == None :
    print("no serial port specified")
    quit()
    pass
else :
    BAUDRATE                 = 57600  # Dynamixel default baudrate : 57600
    COMPORT                  = serialPort["port"]       # ex) Windows: "COM1"   Linux: "/dev/ttyUSB0" Mac: "/dev/tty.usbserial-*
                                                             

# Protocol version
PROTOCOL_VERSION            = 2.0               # See which protocol version is used in the Dynamixel
# Control table address
ADDR_TORQUE_ENABLE = 512
ADDR_GOAL_CURRENT = 550
ADDR_GOAL_VELOCITY = 552
ADDR_PROFILE_ACCELERATION = 556
ADDR_PROFILE_VELOCITY = 560
ADDR_GOAL_POSITION = 564
# Data Byte Length
# LEN_PRO_GOAL_POSITION       = 4
# LEN_PRO_GOAL_VELOCITY       = 4
# LEN_PRO_PRESENT_POSITION    = 4
# LEN_PRO_PRESENT_VELOCITY    = 4
# Data definition
TORQUE_ENABLE               = 1                 # Value for enabling the torque
TORQUE_DISABLE              = 0  


# Initialize PortHandler instance - Set the port path
portHandler = PortHandler(COMPORT)
# Initialize PacketHandler instance - Set the protocol version
packetHandler = PacketHandler(PROTOCOL_VERSION)


# Open port
if portHandler.openPort():
    print("Succeeded to open the port")
else:
    print("Failed to open the port. Exiting..")
    quit()

# Set port baudrate
if portHandler.setBaudRate(BAUDRATE):
    print("Succeeded to change the baudrate")
else:
    print("Failed to change the baudrate. Exiting..")
    quit()



def initDynamixelGripper(idx):
    dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, idx, ADDR_TORQUE_ENABLE, TORQUE_DISABLE)
    dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, idx, ADDR_TORQUE_ENABLE, TORQUE_ENABLE)

    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    elif dxl_error != 0:
        print("%s" % packetHandler.getRxPacketError(dxl_error))
    else:
        print("Dynamixel#%d has been successfully connected" % idx)

    # Set goal current
    dxl_comm_result, dxl_error = packetHandler.write2ByteTxRx(portHandler, idx, ADDR_GOAL_CURRENT, 661)
    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    elif dxl_error != 0:
        print("%s" % packetHandler.getRxPacketError(dxl_error))
    # Set profile acceleration
    dxl_comm_result, dxl_error = packetHandler.write4ByteTxRx(portHandler, idx, ADDR_PROFILE_ACCELERATION, 3447)
    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    elif dxl_error != 0:
        print("%s" % packetHandler.getRxPacketError(dxl_error))
    # Set profile velocity
    dxl_comm_result, dxl_error = packetHandler.write4ByteTxRx(portHandler, idx, ADDR_PROFILE_VELOCITY, 2970)
    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    elif dxl_error != 0:
        print("%s" % packetHandler.getRxPacketError(dxl_error))

def setGripperPos(idx,pos):
    # Set goal position
    dxl_comm_result, dxl_error = packetHandler.write4ByteTxRx(portHandler, idx, ADDR_GOAL_POSITION, pos)
    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    elif dxl_error != 0:
        print("%s" % packetHandler.getRxPacketError(dxl_error))

def endGripper(idx):
    # Disabling motor torque
    dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, idx, ADDR_TORQUE_ENABLE, TORQUE_DISABLE)
    print("Motor torque disabled.")
    # Close port
    portHandler.closePort()
    print("Robot operation terminated.")



if __name__ =="__main__":
    id=1
    initDynamixelGripper(id)
    setGripperPos(id,0)
    sleep(1)
    setGripperPos(id,500)
    sleep(1)
    setGripperPos(id,1000)
    sleep(1)
    setGripperPos(id,0)
    sleep(1)

    endGripper(id)
