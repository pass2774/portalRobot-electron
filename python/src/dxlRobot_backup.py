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

from dynamixel_sdk import *                     # Uses Dynamixel SDK library
from dxl_registerMap import *
# from DynamixelSDK.python.src.dynamixel_sdk import *                     # Uses Dynamixel SDK library
from src.scan_ports import *

# relative file path
if getattr(sys, 'frozen', False):
    __dirname__ =os.path.join(sys._MEIPASS,"..","..") # runned as a .exe file
else:
    __dirname__ =os.path.dirname(os.path.realpath(__file__)) # runned as a .py file
    


with open(os.path.join(__dirname__,"calibration","dxl_param.txt"), "r") as file:
  dxl_param=json.load(file)["dxl-robot"]
print("dxl_param reading success!")


ports={}
for port in COMPorts.get_com_ports().data:
    print("PORT:[{}]  /  DESCRIPTION:{}".format(port.device, port.description))
    ports[port.description]={"port":port.device,"baudrate":57600}

print("platform.system==",platform.system())
if platform.system() == "Linux":
    for key in ["ttyAMA0","ttyAMA1","ttyAMA2","USB <-> Serial Converter - USB <-> Serial Converter"]:
        if key in ports:
            serialPort = ports.get(key)
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


# Initialize GroupSync Read & Write instance
groupSyncWritePos = GroupSyncWrite(portHandler, packetHandler, ADDR_PRO_GOAL_POSITION, LEN_PRO_GOAL_POSITION)
groupSyncReadPos = GroupSyncRead(portHandler, packetHandler, ADDR_PRO_PRESENT_POSITION, LEN_PRO_PRESENT_POSITION)
groupSyncWriteVel = GroupSyncWrite(portHandler, packetHandler, ADDR_PRO_GOAL_VELOCITY, LEN_PRO_GOAL_VELOCITY)
groupSyncReadVel = GroupSyncRead(portHandler, packetHandler, ADDR_PRO_PRESENT_VELOCITY, LEN_PRO_PRESENT_VELOCITY)

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


def initDxlGroupPosControl(dxl_ids):
    # Setup for position control-based dxl motors
    print("ids:",dxl_ids)
    for i in dxl_ids:
        # DISABLE Dynamixel#00i Torque
        dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, i, ADDR_PRO_TORQUE_ENABLE, TORQUE_DISABLE)
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))
        else:
            print("Dynamixel#%d has been successfully connected" % i)

        # Enable Dynamixel#00i Torque
        dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, i, ADDR_PRO_TORQUE_ENABLE, TORQUE_ENABLE)
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))
        else:
            print("Dynamixel#%d has been successfully connected" % i)

        # Set profile acceleration
        dxl_comm_result, dxl_error = packetHandler.write4ByteTxRx(portHandler, i, ADDR_PRO_PROFILE_ACC, dxl_param["pos-control"][str(i)]["profile"]["acc"])
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))

        # Set profile velocity
        dxl_comm_result, dxl_error = packetHandler.write4ByteTxRx(portHandler, i, ADDR_PRO_PROFILE_VEL, dxl_param["pos-control"][str(i)]["profile"]["vel"])
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))
        
        # Add parameter storage for Dynamixel#00i present position value
        dxl_addparam_result = groupSyncReadPos.addParam(i)
        if dxl_addparam_result != True:
            print("[ID:%03d] groupSyncRead addparam failed" % i)
            quit()
            
def initDxlGroupVelControl(dxl_ids):
    # Setup for velocity control-based dxl motors
    for i in dxl_ids:
        # Disable Dynamixel#00i Torque Before operation mode change
        dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, i, ADDR_PRO_TORQUE_ENABLE, TORQUE_DISABLE)
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))
        else:
            print("Dynamixel#%d has been successfully connected" % i)

        # Change Dynamixel#00i operation mode
        dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, i, ADDR_PRO_OPERATING_MODE, VELOCITY_MODE)
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))
        else:
            print("Dynamixel#%d has been successfully connected" % i)

        # Enable Dynamixel#00i Torque
        dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, i, ADDR_PRO_TORQUE_ENABLE, TORQUE_ENABLE)
        if dxl_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
        elif dxl_error != 0:
            print("%s" % packetHandler.getRxPacketError(dxl_error))
        else:
            print("Dynamixel#%d has been successfully connected" % i)
        

def read_cmd(latest_idx):
    b_update = False
    try:
        with open(__filename_command__, "r") as file:
            dict = json.load(file)
        # latest_idx=dict["idx"]
    except:
        dict=[]
        print("read_cmd:json loading failed")
    else:
        if dict["idx"]>latest_idx or dict["idx"]==0:
            print(dict)
            latest_idx=dict["idx"]
            b_update = True
    return [b_update, latest_idx, dict]

def check_exit():
    # try:
    #     with open(__filename_flag__, "r") as file:
    #         dict = json.load(file)
    # except:
    #     dict=[]
    #     print("check_exit: json loading failed")
    # else:
    #     if dict["MODE"]!="NORMAL":
    #         print(dict)
    #         return True
    return False

def dxl_SyncWrite(h_groupSyncWrite,dxl_ids,target_state):
    print("target:",target_state)
    for id in dxl_ids:
        i=str(id)
        # Allocate goal position value into byte array
        buffer = [DXL_LOBYTE(DXL_LOWORD(target_state[i])), DXL_HIBYTE(DXL_LOWORD(target_state[i])), DXL_LOBYTE(DXL_HIWORD(target_state[i])), DXL_HIBYTE(DXL_HIWORD(target_state[i]))]
        # Add Dynamixel#00i goal position value to the Syncwrite parameter storage
        dxl_addparam_result = h_groupSyncWrite.addParam(id, buffer)
        if dxl_addparam_result != True:
            print("[ID:%03d] groupSyncWrite addparam failed" % i)
            quit()
    # Syncwrite goal state
    print("goal:", target_state)
    dxl_comm_result = h_groupSyncWrite.txPacket()
    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    # Clear syncwrite parameter storage
    h_groupSyncWrite.clearParam()

def dxl_ReadState(h_groupSyncRead,dxl_ids,REG_ADDR,REG_LEN):
    # Syncread present state
    dxl_comm_result = h_groupSyncRead.txRxPacket()
    if dxl_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
    dxl_current_state={}
    for i in dxl_ids:
        # Check if groupsyncread data of Dynamixel#1 is available
        dxl_getdata_result = h_groupSyncRead.isAvailable(i, REG_ADDR, REG_LEN)
        if dxl_getdata_result != True:
            print("[ID:%03d] groupSyncRead getdata failed" % i)
            return [False, dxl_current_state]
        # Get Dynamixel#00i present state value
        dxl_current_state[str(i)]=h_groupSyncRead.getData(i, REG_ADDR, REG_LEN)
    return [True, dxl_current_state]

def print_state(dxl_target_pos):
    [isPosAvailable,dxl_current_pos]=dxl_ReadState(groupSyncReadPos,dxl_id_arm,ADDR_PRO_PRESENT_POSITION,LEN_PRO_PRESENT_POSITION)
    # [isvelAvailable,dxl_current_vel]=dxl_ReadState(groupSyncReadVel,dxl_id_gv,ADDR_PRO_PRESENT_VELOCITY,LEN_PRO_PRESENT_VELOCITY)
    # time.sleep(1)
    if isPosAvailable:
        isReached = True
        for id in dxl_id_arm:
            i=str(id)
            if (abs(dxl_current_pos[i]-dxl_target_pos[i])) > DXL_MOVING_STATUS_THRESHOLD:
                isReached = False
        if not isReached:
            print("current pos:",dxl_current_pos)










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



# #main loop
# while 1:
#     print_state(dxl_goal_position)    
#     [b_newData,command_idx,cmd_obj]=read_cmd(command_idx)
#     if b_newData == True:
#         # update target-state
#         dxl_goal_position=interp_maps(cmd_obj["arm"],calib_map["arm"]["pos"],calib_map["arm"]["raw"],np.int32)
#         dxl_goal_velocity=interp_maps(cmd_obj["gv"],calib_map["gv"]["vel"],calib_map["gv"]["raw"],np.int32)
#         # write to dxl
#         dxl_SyncWrite(groupSyncWritePos,dxl_id_arm,dxl_goal_position)
#         dxl_SyncWrite(groupSyncWriteVel,dxl_id_gv,dxl_goal_velocity)
# 
#     
#     # if check_exit() == True:
#     #     dxl_goal_position=interp_maps(home_position,calib_map["arm"]["pos"],calib_map["arm"]["raw"],np.int32)
#     #     dxl_SyncWrite(groupSyncWritePos,dxl_id_arm,dxl_goal_position)
#     #     time.sleep(5)
#     #     break
# 
# for i in dxl_id_arm:
#     # DISABLE Dynamixel#00i Torque
#     dxl_comm_result, dxl_error = packetHandler.write1ByteTxRx(portHandler, i, ADDR_PRO_TORQUE_ENABLE, TORQUE_DISABLE)
#     if dxl_comm_result != COMM_SUCCESS:
#         print("%s" % packetHandler.getTxRxResult(dxl_comm_result))
#     elif dxl_error != 0:
#         print("%s" % packetHandler.getRxPacketError(dxl_error))
# # Close port
# portHandler.closePort()
# print("Motor torque disabled. Robot operation terminated.")


###########


if __name__ =="__main__":
    initDxlGroupPosControl(dxl_ids=[2])
    dxl_SyncWrite(groupSyncWritePos,dxl_ids=[2],target_state={"2":1000})
    print("dxlRobot.py completed.")
    
    